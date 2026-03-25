//go:build sqlite || sqliteonly

package sqlitestore

import (
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite" // pure-Go SQLite driver
)

// OpenDB opens a SQLite database at the given path with WAL mode and recommended pragmas.
// Uses modernc.org/sqlite (pure Go, zero CGo).
func OpenDB(path string) (*sql.DB, error) {
	dsn := fmt.Sprintf("file:%s?_journal_mode=WAL&_busy_timeout=5000&_foreign_keys=ON&_txlock=immediate", path)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}

	// SQLite is single-writer but WAL allows concurrent readers.
	// Allow multiple read connections; writes serialize via _txlock=immediate.
	db.SetMaxOpenConns(4)

	// Verify connection works.
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}

	return db, nil
}
