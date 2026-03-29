package http

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"sync"

	"github.com/google/uuid"

	"github.com/nextlevelbuilder/goclaw/internal/config"
	"github.com/nextlevelbuilder/goclaw/internal/i18n"
	"github.com/nextlevelbuilder/goclaw/internal/store"
	"github.com/nextlevelbuilder/goclaw/pkg/protocol"
)

const maxImportBodySize = 500 << 20 // 500MB

// importCleanup tracks created context files for rollback on failure.
type importCleanup struct {
	mu    sync.Mutex
	files []string // agent context file names (for log only; DB rollback handles actual cleanup)
}

func (c *importCleanup) TrackFile(name string) {
	c.mu.Lock()
	c.files = append(c.files, name)
	c.mu.Unlock()
}

// importArchive is the parsed contents of an agent archive.
type importArchive struct {
	manifest     *ExportManifest
	agentConfig  map[string]json.RawMessage
	contextFiles []importContextFile
	userContextFiles []importUserContextFile
	memoryGlobal []MemoryExport
	memoryUsers  map[string][]MemoryExport // userID → docs
	kgEntities   []KGEntityExport
	kgRelations  []KGRelationExport
}

type importContextFile struct {
	fileName string
	content  string
}

type importUserContextFile struct {
	userID   string
	fileName string
	content  string
}

// ImportSummary is returned after a successful import.
type ImportSummary struct {
	AgentID      string `json:"agent_id"`
	AgentKey     string `json:"agent_key"`
	ContextFiles int    `json:"context_files"`
	MemoryDocs   int    `json:"memory_docs"`
	KGEntities   int    `json:"kg_entities"`
	KGRelations  int    `json:"kg_relations"`
}

// parseImportSections parses the ?include= query param (comma-separated section names).
// Defaults to all sections if empty.
func parseImportSections(raw string) map[string]bool {
	all := map[string]bool{
		"config":         true,
		"context_files":  true,
		"memory":         true,
		"knowledge_graph": true,
	}
	if raw == "" {
		return all
	}
	out := make(map[string]bool)
	for _, s := range strings.Split(raw, ",") {
		if s = strings.TrimSpace(s); s != "" {
			out[s] = true
		}
	}
	return out
}

// canImport checks if userID has permission to import agents (system owner only for now).
func (h *AgentsHandler) canImport(userID string) bool {
	return h.isOwnerUser(userID)
}

// handleImportPreview parses the archive manifest and returns it without importing.
func (h *AgentsHandler) handleImportPreview(w http.ResponseWriter, r *http.Request) {
	userID := store.UserIDFromContext(r.Context())
	locale := store.LocaleFromContext(r.Context())

	if !h.canImport(userID) {
		writeError(w, http.StatusForbidden, protocol.ErrUnauthorized, i18n.T(locale, i18n.MsgNoAccess, "import"))
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxImportBodySize)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeError(w, http.StatusBadRequest, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidRequest, "multipart parse: "+err.Error()))
		return
	}

	f, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidRequest, "missing 'file' field"))
		return
	}
	defer f.Close()

	arc, err := readImportArchive(f)
	if err != nil {
		writeError(w, http.StatusBadRequest, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidRequest, "archive parse: "+err.Error()))
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"manifest":      arc.manifest,
		"context_files": len(arc.contextFiles),
		"memory_docs":   len(arc.memoryGlobal) + countUserMemory(arc.memoryUsers),
		"kg_entities":   len(arc.kgEntities),
		"kg_relations":  len(arc.kgRelations),
	})
}

// handleImport creates a new agent from an uploaded archive.
func (h *AgentsHandler) handleImport(w http.ResponseWriter, r *http.Request) {
	userID := store.UserIDFromContext(r.Context())
	locale := store.LocaleFromContext(r.Context())

	if !h.canImport(userID) {
		writeError(w, http.StatusForbidden, protocol.ErrUnauthorized, i18n.T(locale, i18n.MsgNoAccess, "import agent"))
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxImportBodySize)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeError(w, http.StatusBadRequest, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidRequest, "multipart parse: "+err.Error()))
		return
	}

	f, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidRequest, "missing 'file' field"))
		return
	}
	defer f.Close()

	arc, err := readImportArchive(f)
	if err != nil {
		writeError(w, http.StatusBadRequest, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidRequest, "archive parse: "+err.Error()))
		return
	}

	stream := r.URL.Query().Get("stream") == "true"
	if stream {
		flusher := initSSE(w)
		if flusher == nil {
			writeError(w, http.StatusInternalServerError, protocol.ErrInternal, "streaming not supported")
			return
		}
		progressFn := func(ev ProgressEvent) { sendSSE(w, flusher, "progress", ev) }
		summary, importErr := h.doImportNewAgent(r.Context(), r, arc, progressFn)
		if importErr != nil {
			sendSSE(w, flusher, "error", ProgressEvent{Phase: "import", Status: "error", Detail: importErr.Error()})
			return
		}
		sendSSE(w, flusher, "complete", summary)
		return
	}

	summary, err := h.doImportNewAgent(r.Context(), r, arc, nil)
	if err != nil {
		slog.Error("agents.import", "error", err)
		writeError(w, http.StatusInternalServerError, protocol.ErrInternal, i18n.T(locale, i18n.MsgInternalError, err.Error()))
		return
	}
	writeJSON(w, http.StatusCreated, summary)
}

// handleMergeImport merges archive data into an existing agent.
func (h *AgentsHandler) handleMergeImport(w http.ResponseWriter, r *http.Request) {
	userID := store.UserIDFromContext(r.Context())
	locale := store.LocaleFromContext(r.Context())

	ag, status, err := h.lookupAccessibleAgent(r)
	if err != nil {
		writeError(w, status, protocol.ErrNotFound, err.Error())
		return
	}
	// Require agent owner or system owner
	if ag.OwnerID != userID && !h.isOwnerUser(userID) {
		writeError(w, http.StatusForbidden, protocol.ErrUnauthorized, i18n.T(locale, i18n.MsgNoAccess, "merge import"))
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxImportBodySize)
	if err := r.ParseMultipartForm(32 << 20); err != nil {
		writeError(w, http.StatusBadRequest, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidRequest, "multipart parse: "+err.Error()))
		return
	}

	f, _, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidRequest, "missing 'file' field"))
		return
	}
	defer f.Close()

	arc, err := readImportArchive(f)
	if err != nil {
		writeError(w, http.StatusBadRequest, protocol.ErrInvalidRequest, i18n.T(locale, i18n.MsgInvalidRequest, "archive parse: "+err.Error()))
		return
	}

	sections := parseImportSections(r.URL.Query().Get("include"))
	stream := r.URL.Query().Get("stream") == "true"

	if stream {
		flusher := initSSE(w)
		if flusher == nil {
			writeError(w, http.StatusInternalServerError, protocol.ErrInternal, "streaming not supported")
			return
		}
		progressFn := func(ev ProgressEvent) { sendSSE(w, flusher, "progress", ev) }
		summary, mergeErr := h.doMergeImport(r.Context(), ag, arc, sections, progressFn)
		if mergeErr != nil {
			slog.Error("agents.merge_import.sse", "agent_id", ag.ID, "error", mergeErr)
			sendSSE(w, flusher, "error", map[string]any{"phase": "merge", "detail": mergeErr.Error(), "rolled_back": true})
			return
		}
		sendSSE(w, flusher, "complete", summary)
		return
	}

	summary, err := h.doMergeImport(r.Context(), ag, arc, sections, nil)
	if err != nil {
		slog.Error("agents.merge_import", "agent_id", ag.ID, "error", err)
		writeError(w, http.StatusInternalServerError, protocol.ErrInternal, i18n.T(locale, i18n.MsgInternalError, err.Error()))
		return
	}
	writeJSON(w, http.StatusOK, summary)
}

// doImportNewAgent creates a new agent from the archive, returning import summary.
func (h *AgentsHandler) doImportNewAgent(ctx context.Context, r *http.Request, arc *importArchive, progressFn func(ProgressEvent)) (*ImportSummary, error) {
	tenantID := store.TenantIDFromContext(ctx)
	userID := store.UserIDFromContext(ctx)

	// Build agent record from archive config + optional overrides
	agentKey := r.FormValue("agent_key")
	displayName := r.FormValue("display_name")

	if agentKey == "" && arc.agentConfig["agent_key"] != nil {
		json.Unmarshal(arc.agentConfig["agent_key"], &agentKey) //nolint:errcheck
	}
	if displayName == "" && arc.agentConfig["display_name"] != nil {
		json.Unmarshal(arc.agentConfig["display_name"], &displayName) //nolint:errcheck
	}
	if agentKey == "" && displayName != "" {
		agentKey = config.NormalizeAgentID(displayName)
	}
	if agentKey == "" {
		return nil, errors.New("agent_key is required (not found in archive or request)")
	}

	// Dedup: suffix with -N if key already exists
	agentKey = h.dedupAgentKey(ctx, agentKey)

	ag := h.buildAgentFromArchive(arc.agentConfig, agentKey, displayName, tenantID, userID)

	if progressFn != nil {
		progressFn(ProgressEvent{Phase: "config", Status: "running"})
	}

	if err := h.agents.Create(ctx, ag); err != nil {
		return nil, fmt.Errorf("create agent: %w", err)
	}

	if progressFn != nil {
		progressFn(ProgressEvent{Phase: "config", Status: "done", Current: 1, Total: 1})
	}

	sections := map[string]bool{
		"context_files":   true,
		"memory":          true,
		"knowledge_graph": true,
	}
	summary, err := h.doMergeImport(ctx, ag, arc, sections, progressFn)
	if err != nil {
		// Best-effort: agent already created, log but return partial summary
		slog.Error("agents.import.merge_data", "agent_id", ag.ID, "error", err)
		return &ImportSummary{AgentID: ag.ID.String(), AgentKey: ag.AgentKey}, err
	}
	summary.AgentID = ag.ID.String()
	summary.AgentKey = ag.AgentKey
	return summary, nil
}

// doMergeImport upserts sections of the archive into the target agent.
func (h *AgentsHandler) doMergeImport(ctx context.Context, ag *store.AgentData, arc *importArchive, sections map[string]bool, progressFn func(ProgressEvent)) (*ImportSummary, error) {
	summary := &ImportSummary{AgentID: ag.ID.String(), AgentKey: ag.AgentKey}

	// Section: context_files
	if sections["context_files"] {
		if progressFn != nil {
			progressFn(ProgressEvent{Phase: "context_files", Status: "running", Total: len(arc.contextFiles)})
		}
		for _, cf := range arc.contextFiles {
			if err := h.agents.SetAgentContextFile(ctx, ag.ID, cf.fileName, cf.content); err != nil {
				return nil, fmt.Errorf("set context file %s: %w", cf.fileName, err)
			}
			summary.ContextFiles++
		}
		for _, ucf := range arc.userContextFiles {
			if err := h.agents.SetUserContextFile(ctx, ag.ID, ucf.userID, ucf.fileName, ucf.content); err != nil {
				return nil, fmt.Errorf("set user context file %s/%s: %w", ucf.userID, ucf.fileName, err)
			}
			summary.ContextFiles++
		}
		if progressFn != nil {
			progressFn(ProgressEvent{Phase: "context_files", Status: "done", Current: summary.ContextFiles, Total: summary.ContextFiles})
		}
	}

	// Section: memory
	if sections["memory"] && h.memoryStore != nil {
		totalDocs := len(arc.memoryGlobal) + countUserMemory(arc.memoryUsers)
		if progressFn != nil {
			progressFn(ProgressEvent{Phase: "memory", Status: "running", Total: totalDocs})
		}
		for _, doc := range arc.memoryGlobal {
			if err := h.memoryStore.PutDocument(ctx, ag.ID.String(), "", doc.Path, doc.Content); err != nil {
				return nil, fmt.Errorf("put memory doc %s: %w", doc.Path, err)
			}
			summary.MemoryDocs++
		}
		for uid, docs := range arc.memoryUsers {
			for _, doc := range docs {
				if err := h.memoryStore.PutDocument(ctx, ag.ID.String(), uid, doc.Path, doc.Content); err != nil {
					return nil, fmt.Errorf("put memory doc %s/%s: %w", uid, doc.Path, err)
				}
				summary.MemoryDocs++
			}
		}
		if progressFn != nil {
			progressFn(ProgressEvent{Phase: "memory", Status: "done", Current: summary.MemoryDocs, Total: totalDocs})
		}
		// Async re-index
		go h.reindexImportedMemory(context.WithoutCancel(ctx), ag.ID.String(), arc)
	}

	// Section: knowledge_graph
	if sections["knowledge_graph"] && h.kgStore != nil && len(arc.kgEntities) > 0 {
		if progressFn != nil {
			progressFn(ProgressEvent{Phase: "knowledge_graph", Status: "running", Total: len(arc.kgEntities)})
		}
		if err := h.ingestKGByUser(ctx, ag.ID.String(), arc); err != nil {
			return nil, fmt.Errorf("ingest kg: %w", err)
		}
		summary.KGEntities = len(arc.kgEntities)
		summary.KGRelations = len(arc.kgRelations)
		if progressFn != nil {
			progressFn(ProgressEvent{Phase: "knowledge_graph", Status: "done", Current: len(arc.kgEntities), Total: len(arc.kgEntities)})
		}
	}

	return summary, nil
}

// ingestKGByUser groups KG entities/relations by user_id and calls IngestExtraction per group.
func (h *AgentsHandler) ingestKGByUser(ctx context.Context, agentID string, arc *importArchive) error {
	// Group entities by user_id
	type userGroup struct {
		entities  []store.Entity
		relations []store.Relation
	}
	groups := make(map[string]*userGroup)
	for _, e := range arc.kgEntities {
		uid := e.UserID
		if groups[uid] == nil {
			groups[uid] = &userGroup{}
		}
		groups[uid].entities = append(groups[uid].entities, store.Entity{
			AgentID:     agentID,
			UserID:      uid,
			ExternalID:  e.ExternalID,
			Name:        e.Name,
			EntityType:  e.EntityType,
			Description: e.Description,
			Properties:  e.Properties,
			Confidence:  e.Confidence,
		})
	}
	for _, rel := range arc.kgRelations {
		uid := rel.UserID
		if groups[uid] == nil {
			groups[uid] = &userGroup{}
		}
		groups[uid].relations = append(groups[uid].relations, store.Relation{
			AgentID:        agentID,
			UserID:         uid,
			SourceEntityID: rel.SourceExternalID,
			TargetEntityID: rel.TargetExternalID,
			RelationType:   rel.RelationType,
			Confidence:     rel.Confidence,
			Properties:     rel.Properties,
		})
	}
	for uid, g := range groups {
		if _, err := h.kgStore.IngestExtraction(ctx, agentID, uid, g.entities, g.relations); err != nil {
			return fmt.Errorf("user %s: %w", uid, err)
		}
	}
	return nil
}

// reindexImportedMemory re-indexes all imported documents in background.
func (h *AgentsHandler) reindexImportedMemory(ctx context.Context, agentID string, arc *importArchive) {
	for _, doc := range arc.memoryGlobal {
		if err := h.memoryStore.IndexDocument(ctx, agentID, "", doc.Path); err != nil {
			slog.Warn("agents.import.reindex", "agent_id", agentID, "path", doc.Path, "error", err)
		}
	}
	for uid, docs := range arc.memoryUsers {
		for _, doc := range docs {
			if err := h.memoryStore.IndexDocument(ctx, agentID, uid, doc.Path); err != nil {
				slog.Warn("agents.import.reindex", "agent_id", agentID, "user_id", uid, "path", doc.Path, "error", err)
			}
		}
	}
}

// buildAgentFromArchive constructs an AgentData from the parsed archive config map.
func (h *AgentsHandler) buildAgentFromArchive(cfg map[string]json.RawMessage, agentKey, displayName string, tenantID uuid.UUID, ownerID string) *store.AgentData {
	ag := &store.AgentData{
		AgentKey:    agentKey,
		DisplayName: displayName,
		TenantID:    tenantID,
		OwnerID:     ownerID,
		Status:      store.AgentStatusActive,
	}
	unmarshalField(cfg, "frontmatter", &ag.Frontmatter)
	unmarshalField(cfg, "provider", &ag.Provider)
	unmarshalField(cfg, "model", &ag.Model)
	unmarshalField(cfg, "agent_type", &ag.AgentType)
	unmarshalField(cfg, "context_window", &ag.ContextWindow)
	unmarshalField(cfg, "max_tool_iterations", &ag.MaxToolIterations)

	ag.ToolsConfig = rawOrNil(cfg["tools_config"])
	ag.SandboxConfig = rawOrNil(cfg["sandbox_config"])
	ag.SubagentsConfig = rawOrNil(cfg["subagents_config"])
	ag.MemoryConfig = rawOrNil(cfg["memory_config"])
	ag.CompactionConfig = rawOrNil(cfg["compaction_config"])
	ag.ContextPruning = rawOrNil(cfg["context_pruning"])
	ag.OtherConfig = rawOrNil(cfg["other_config"])

	if ag.AgentType == "" {
		ag.AgentType = store.AgentTypeOpen
	}
	if ag.ContextWindow <= 0 {
		ag.ContextWindow = config.DefaultContextWindow
	}
	if ag.MaxToolIterations <= 0 {
		ag.MaxToolIterations = config.DefaultMaxIterations
	}
	ag.Workspace = fmt.Sprintf("%s/%s", h.defaultWorkspace, ag.AgentKey)
	ag.RestrictToWorkspace = true

	if len(ag.CompactionConfig) == 0 {
		ag.CompactionConfig = json.RawMessage(`{}`)
	}
	if len(ag.MemoryConfig) == 0 {
		ag.MemoryConfig = json.RawMessage(`{"enabled":true}`)
	}
	return ag
}

// dedupAgentKey appends -2, -3, ... until the key is unique in the store.
func (h *AgentsHandler) dedupAgentKey(ctx context.Context, base string) string {
	key := base
	for i := 2; i <= 100; i++ {
		if existing, _ := h.agents.GetByKey(ctx, key); existing == nil {
			return key
		}
		key = fmt.Sprintf("%s-%d", base, i)
	}
	return key
}

