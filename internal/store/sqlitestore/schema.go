//go:build sqlite || sqliteonly

package sqlitestore

import (
	"database/sql"
	_ "embed"
	"fmt"
	"log/slog"
)

//go:embed schema.sql
var schemaSQL string

// SchemaVersion is the current SQLite schema version.
// Bump this when adding new migration statements to schema.sql.
const SchemaVersion = 1

// EnsureSchema creates tables if they don't exist and applies migrations.
func EnsureSchema(db *sql.DB) error {
	// Create version table with PK constraint (L1 fix: prevents multiple rows).
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_version (
		version INTEGER NOT NULL PRIMARY KEY
	)`); err != nil {
		return fmt.Errorf("create schema_version: %w", err)
	}

	var current int
	err := db.QueryRow("SELECT version FROM schema_version LIMIT 1").Scan(&current)
	if err == sql.ErrNoRows {
		// Fresh database — apply full schema inside a transaction (C2 fix).
		slog.Info("sqlite: applying initial schema", "version", SchemaVersion)
		tx, txErr := db.Begin()
		if txErr != nil {
			return fmt.Errorf("begin schema tx: %w", txErr)
		}
		if _, err := tx.Exec(schemaSQL); err != nil {
			tx.Rollback()
			return fmt.Errorf("apply schema: %w", err)
		}
		if _, err := tx.Exec("INSERT INTO schema_version (version) VALUES (?)", SchemaVersion); err != nil {
			tx.Rollback()
			return fmt.Errorf("set schema version: %w", err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit schema tx: %w", err)
		}
		return nil
	}
	if err != nil {
		return fmt.Errorf("read schema version: %w", err)
	}

	// C1 fix: fail closed on version mismatch until incremental migrations exist.
	if current < SchemaVersion {
		return fmt.Errorf(
			"sqlite schema version %d is older than required %d; "+
				"incremental migration not yet supported — delete %s and restart to recreate",
			current, SchemaVersion, "goclaw.db",
		)
	}

	return nil
}
