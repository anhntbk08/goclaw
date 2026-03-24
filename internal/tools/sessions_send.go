package tools

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/nextlevelbuilder/goclaw/internal/bus"
	"github.com/nextlevelbuilder/goclaw/internal/store"
)

// ============================================================
// sessions_send
// ============================================================

type SessionsSendTool struct {
	sessions store.SessionStore
	msgBus   *bus.MessageBus
}

func NewSessionsSendTool() *SessionsSendTool { return &SessionsSendTool{} }

func (t *SessionsSendTool) SetSessionStore(s store.SessionStore) { t.sessions = s }
func (t *SessionsSendTool) SetMessageBus(b *bus.MessageBus)      { t.msgBus = b }

func (t *SessionsSendTool) Name() string { return "sessions_send" }
func (t *SessionsSendTool) Description() string {
	return "Send a message into another session. Use session_key or label to identify the target."
}

func (t *SessionsSendTool) Parameters() map[string]any {
	return map[string]any{
		"type": "object",
		"properties": map[string]any{
			"session_key": map[string]any{
				"type":        "string",
				"description": "Target session key",
			},
			"label": map[string]any{
				"type":        "string",
				"description": "Target session label (alternative to session_key)",
			},
			"message": map[string]any{
				"type":        "string",
				"description": "Message to send",
			},
		},
		"required": []string{"message"},
	}
}

func (t *SessionsSendTool) Execute(ctx context.Context, args map[string]any) *Result {
	if t.sessions == nil {
		return ErrorResult("session store not available")
	}
	if t.msgBus == nil {
		return ErrorResult("message bus not available")
	}

	sessionKey, _ := args["session_key"].(string)
	label, _ := args["label"].(string)
	message, _ := args["message"].(string)

	if message == "" {
		return ErrorResult("message is required")
	}
	if sessionKey == "" && label == "" {
		return ErrorResult("either session_key or label is required")
	}

	agentKey := resolveAgentKey(ctx)

	// Resolve by label if needed
	if sessionKey == "" && label != "" {
		sessions := t.sessions.List(ctx, agentKey)
		for _, s := range sessions {
			// Check if label matches by loading session data
			data := t.sessions.GetOrCreate(ctx, s.Key)
			if data.Label == label {
				sessionKey = s.Key
				break
			}
		}
		if sessionKey == "" {
			return ErrorResult(fmt.Sprintf("no session found with label: %s", label))
		}
	}

	// Security: validate target session belongs to same agent
	if agentKey != "" && !strings.HasPrefix(sessionKey, "agent:"+agentKey+":") {
		return ErrorResult("access denied: target session belongs to a different agent")
	}

	// Publish as an inbound message (same mechanism as channels)
	t.msgBus.PublishInbound(bus.InboundMessage{
		Channel:  "system",
		SenderID: "session_send_tool",
		ChatID:   sessionKey,
		Content:  message,
		PeerKind: "direct",
		TenantID: store.TenantIDFromContext(ctx),
	})

	return SilentResult(fmt.Sprintf(`{"status":"accepted","session_key":"%s"}`, sessionKey))
}

// ============================================================
// helpers
// ============================================================

// resolveAgentKey returns the agent string key from context (e.g. "default", "my-agent").
// Used for session key prefix matching where keys follow "agent:<key>:<rest>".
func resolveAgentKey(ctx context.Context) string {
	return store.AgentKeyFromContext(ctx)
}

// resolveAgentUUIDString returns the agent UUID as a string from context.
// Used for DB operations where agent_id is stored as UUID.
func resolveAgentUUIDString(ctx context.Context) string {
	id := store.AgentIDFromContext(ctx)
	if id == uuid.Nil {
		return ""
	}
	return id.String()
}
