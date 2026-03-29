package pg

import (
	"context"
	"database/sql"

	"github.com/google/uuid"
	"github.com/nextlevelbuilder/goclaw/internal/store"
)

// Export types — used exclusively by the agent export pipeline.

type AgentContextFileExport struct {
	FileName string
	Content  string
}

type UserContextFileExport struct {
	UserID   string
	FileName string
	Content  string
}

type MemoryDocExport struct {
	Path    string
	Content string
	UserID  string
}

type ExportPreview struct {
	ContextFiles     int `json:"context_files"`
	UserContextFiles int `json:"user_context_files_users"`
	MemoryGlobal     int `json:"memory_global"`
	MemoryPerUser    int `json:"memory_per_user"`
	KGEntities       int `json:"kg_entities"`
	KGRelations      int `json:"kg_relations"`
	UserProfiles     int `json:"user_profiles"`
	UserOverrides    int `json:"user_overrides"`
}

const exportBatchSize = 1000

// ExportAgentContextFiles returns all agent-level context files for the given agent.
func ExportAgentContextFiles(ctx context.Context, db *sql.DB, agentID uuid.UUID) ([]AgentContextFileExport, error) {
	tc, tcArgs, _, err := scopeClause(ctx, 2)
	if err != nil {
		return nil, err
	}
	rows, err := db.QueryContext(ctx,
		"SELECT file_name, content FROM agent_context_files WHERE agent_id = $1"+tc,
		append([]any{agentID}, tcArgs...)...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []AgentContextFileExport
	for rows.Next() {
		var f AgentContextFileExport
		if err := rows.Scan(&f.FileName, &f.Content); err != nil {
			continue
		}
		result = append(result, f)
	}
	return result, rows.Err()
}

// ExportUserContextFiles returns all per-user context files for the given agent (all users).
func ExportUserContextFiles(ctx context.Context, db *sql.DB, agentID uuid.UUID) ([]UserContextFileExport, error) {
	tc, tcArgs, _, err := scopeClause(ctx, 2)
	if err != nil {
		return nil, err
	}
	rows, err := db.QueryContext(ctx,
		"SELECT user_id, file_name, content FROM user_context_files WHERE agent_id = $1"+tc,
		append([]any{agentID}, tcArgs...)...,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []UserContextFileExport
	for rows.Next() {
		var f UserContextFileExport
		if err := rows.Scan(&f.UserID, &f.FileName, &f.Content); err != nil {
			continue
		}
		result = append(result, f)
	}
	return result, rows.Err()
}

// ExportMemoryDocuments returns all memory documents for the given agent across all users,
// using cursor-based pagination to handle large datasets.
func ExportMemoryDocuments(ctx context.Context, db *sql.DB, agentID uuid.UUID) ([]MemoryDocExport, error) {
	tc, tcArgs, _, err := scopeClause(ctx, 2)
	if err != nil {
		return nil, err
	}

	baseArgs := append([]any{agentID}, tcArgs...)
	cursorParam := len(baseArgs) + 1
	limitParam := cursorParam + 1

	var result []MemoryDocExport
	cursor := uuid.Nil

	for {
		args := append(append([]any{}, baseArgs...), cursor, exportBatchSize)
		rows, err := db.QueryContext(ctx,
			"SELECT id, path, content, COALESCE(user_id, '') FROM memory_documents"+
				" WHERE agent_id = $1"+tc+
				" AND id > $"+itoa(cursorParam)+
				" ORDER BY id LIMIT $"+itoa(limitParam),
			args...,
		)
		if err != nil {
			return nil, err
		}

		count := 0
		for rows.Next() {
			var id uuid.UUID
			var d MemoryDocExport
			if err := rows.Scan(&id, &d.Path, &d.Content, &d.UserID); err != nil {
				continue
			}
			result = append(result, d)
			cursor = id
			count++
		}
		rows.Close()
		if err := rows.Err(); err != nil {
			return nil, err
		}
		if count < exportBatchSize {
			break
		}
	}
	return result, nil
}

// ExportKGEntities returns all KG entities for the given agent across all user scopes,
// using cursor-based pagination.
func ExportKGEntities(ctx context.Context, db *sql.DB, agentID uuid.UUID) ([]store.Entity, error) {
	tc, tcArgs, _, err := scopeClause(ctx, 2)
	if err != nil {
		return nil, err
	}

	baseArgs := append([]any{agentID}, tcArgs...)
	cursorParam := len(baseArgs) + 1
	limitParam := cursorParam + 1

	var result []store.Entity
	cursor := uuid.Nil

	for {
		args := append(append([]any{}, baseArgs...), cursor, exportBatchSize)
		rows, err := db.QueryContext(ctx,
			"SELECT id, agent_id, user_id, external_id, name, entity_type, description,"+
				" properties, source_id, confidence, created_at, updated_at"+
				" FROM kg_entities WHERE agent_id = $1"+tc+
				" AND id > $"+itoa(cursorParam)+
				" ORDER BY id LIMIT $"+itoa(limitParam),
			args...,
		)
		if err != nil {
			return nil, err
		}

		batch, scanErr := scanEntities(rows)
		rows.Close()
		if scanErr != nil {
			return nil, scanErr
		}
		result = append(result, batch...)
		if len(batch) < exportBatchSize {
			break
		}
		// Advance cursor: last entity ID
		lastID := mustParseUUID(batch[len(batch)-1].ID)
		cursor = lastID
	}
	return result, nil
}

// ExportKGRelations returns all KG relations for the given agent across all user scopes,
// using cursor-based pagination.
func ExportKGRelations(ctx context.Context, db *sql.DB, agentID uuid.UUID) ([]store.Relation, error) {
	tc, tcArgs, _, err := scopeClause(ctx, 2)
	if err != nil {
		return nil, err
	}

	baseArgs := append([]any{agentID}, tcArgs...)
	cursorParam := len(baseArgs) + 1
	limitParam := cursorParam + 1

	var result []store.Relation
	cursor := uuid.Nil

	for {
		args := append(append([]any{}, baseArgs...), cursor, exportBatchSize)
		rows, err := db.QueryContext(ctx,
			"SELECT id, agent_id, user_id, source_entity_id, relation_type, target_entity_id,"+
				" confidence, properties, created_at"+
				" FROM kg_relations WHERE agent_id = $1"+tc+
				" AND id > $"+itoa(cursorParam)+
				" ORDER BY id LIMIT $"+itoa(limitParam),
			args...,
		)
		if err != nil {
			return nil, err
		}

		batch, scanErr := scanRelations(rows)
		rows.Close()
		if scanErr != nil {
			return nil, scanErr
		}
		result = append(result, batch...)
		if len(batch) < exportBatchSize {
			break
		}
		lastID := mustParseUUID(batch[len(batch)-1].ID)
		cursor = lastID
	}
	return result, nil
}

// ExportPreviewCounts returns aggregate counts for all exportable sections of an agent.
func ExportPreviewCounts(ctx context.Context, db *sql.DB, agentID uuid.UUID) (*ExportPreview, error) {
	tc, tcArgs, _, err := scopeClause(ctx, 2)
	if err != nil {
		return nil, err
	}
	args := append([]any{agentID}, tcArgs...)

	var p ExportPreview
	err = db.QueryRowContext(ctx, `
		SELECT
			(SELECT COUNT(*) FROM agent_context_files  WHERE agent_id = $1`+tc+`) AS context_files,
			(SELECT COUNT(DISTINCT user_id) FROM user_context_files WHERE agent_id = $1`+tc+`) AS user_context_files_users,
			(SELECT COUNT(*) FROM memory_documents     WHERE agent_id = $1 AND user_id IS NULL`+tc+`) AS memory_global,
			(SELECT COUNT(*) FROM memory_documents     WHERE agent_id = $1 AND user_id IS NOT NULL`+tc+`) AS memory_per_user,
			(SELECT COUNT(*) FROM kg_entities          WHERE agent_id = $1`+tc+`) AS kg_entities,
			(SELECT COUNT(*) FROM kg_relations         WHERE agent_id = $1`+tc+`) AS kg_relations,
			(SELECT COUNT(*) FROM user_agent_profiles  WHERE agent_id = $1`+tc+`) AS user_profiles,
			(SELECT COUNT(*) FROM user_agent_overrides WHERE agent_id = $1`+tc+`) AS user_overrides
	`, args...).Scan(
		&p.ContextFiles, &p.UserContextFiles,
		&p.MemoryGlobal, &p.MemoryPerUser,
		&p.KGEntities, &p.KGRelations,
		&p.UserProfiles, &p.UserOverrides,
	)
	if err != nil {
		return nil, err
	}
	return &p, nil
}

