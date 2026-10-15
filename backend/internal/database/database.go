package database

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/mattn/go-sqlite3"
)

const schema = `
CREATE TABLE IF NOT EXISTS menu_items (
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	name TEXT NOT NULL,
	parent_id INTEGER REFERENCES menu_items(id) ON DELETE CASCADE,
	sort_key INTEGER NOT NULL DEFAULT 0,
	url TEXT,
	icon TEXT,
	is_active BOOLEAN NOT NULL DEFAULT 1,
	created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_menu_items_parent_id ON menu_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_sort_key ON menu_items(parent_id, sort_key);
CREATE INDEX IF NOT EXISTS idx_menu_items_is_active ON menu_items(is_active);
`

func InitDB(dataSourceName string) (*sql.DB, error) {
	db, err := sql.Open("sqlite3", dataSourceName)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if _, err := db.Exec(schema); err != nil {
		return nil, fmt.Errorf("failed to create schema: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	return db, nil
}

func InitDBInMemory() (*sql.DB, error) {
	return InitDB(":memory:")
}

func InitDBFile(path string) (*sql.DB, error) {
	_ = os.MkdirAll("./data", 0755)
	return InitDB(path)
}