# Menu Tree Manager

A hierarchical tree menu management system with a Go backend API and a React frontend. Supports infinitely nested menu items using the adjacency list pattern, with full CRUD operations, tree reorganization via drag-and-drop, keyboard-based sort key adjustment, and edit/update capabilities.

## Overview

The Menu Tree Manager is a full-stack application for building and managing hierarchical navigation menus. The backend exposes a RESTful JSON API backed by SQLite using the adjacency list pattern (`parent_id` self-referential foreign key). The frontend is a React application (Vite + React Router) that provides views for creating, editing, viewing, and reorganizing menu items in both flat list and nested tree layouts.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Frontend Usage](#frontend-usage)
- [Database Schema](#database-schema)
- [Sort Key Management](#sort-key-management)
- [Contributing](#contributing)
- [License](#license)

## Features

### Backend (Go)
- **RESTful JSON API** using only the Go standard library (`net/http`, `database/sql`, `encoding/json`)
- **SQLite database** with adjacency list schema for nested menus
- **Full CRUD**: create, read, update, delete menu items
- **Nested tree retrieval** — O(n) single-pass tree building from flat records
- **Flat list retrieval** — for admin tables and parent selection
- **Direct children retrieval** — fetch children of a specific parent
- **Partial updates** — `UpdateMenuItemRequest` with optional fields
- **Cascade delete** — deleting a parent removes its entire subtree
- **Bulk reorder** — assign sequential sort keys to an ordered list of sibling IDs
- **Move item** — relocate an item to a new parent at a specified position
- **Circular reference detection** — prevents self-parenting and ancestor cycles
- **CORS middleware** — configured for local frontend development
- **Environment configuration** — `SERVER_ADDR` and `DB_PATH`

### Frontend (React + Vite)
- **Dashboard** — entry point with navigation cards
- **Flat Menu List** — sortable table view of all menu items with depth indentation
- **Menu Tree** — nested collapsible tree view with drag-and-drop reordering
- **Create / Edit Menu Item** — shared `MenuForm` component supporting both creation and editing with client-side validation (required name, URL format, circular parent prevention)
- **Sidebar Tree Page** — tree view in a left sidebar with a main content area that displays the selected item's computed path
- **Up/Down sort buttons** — adjust an item's `sort_key` one step at a time
- **Arrow key sort adjustment** — press `ArrowUp` / `ArrowDown` on a focused node to increment/decrement its sort key
- **Responsive navigation** — top bar links to all pages

### Tree Operations
- **Drag-and-drop** — drag leaf nodes onto other nodes to reparent them; drop onto root area to make root-level
- **Sort key auto-update** — moved items are assigned `sort_key = 0` at their new position
- **Path computation** — selected item's full breadcrumb path is derived dynamically by traversing parent IDs (no materialized path column stored)

## Architecture

```
menu-tree-manager/
├── backend/
│   ├── go.mod
│   ├── go.sum
│   ├── PROGRESS.md
│   ├── data/
│   │   └── menu.db                 # SQLite database file
│   ├── cmd/
│   │   └── server/
│   │       └── main.go             # Entry point, HTTP server, wiring
│   └── internal/
│       ├── database/
│       │   └── database.go         # SQLite connection + schema init
│       ├── models/
│       │   └── menu.go             # MenuItem structs & DTOs
│       ├── repository/
│       │   └── menu.go             # Data access layer (CRUD, tree algorithms)
│       ├── service/
│       │   └── menu.go             # Business logic layer
│       └── handler/
│           ├── handler.go          # /hello, /health endpoints
│           └── menu.go             # Tree menu HTTP handlers
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx                 # Router + layout + routes
        ├── App.css
        ├── index.css
        ├── api/
        │   └── menu.ts             # menuApi client
        ├── types/
        │   └── menu.ts             # TypeScript interfaces
        ├── components/
        │   └── MenuForm.tsx        # Shared create/edit form
        └── pages/
            ├── CreateMenuPage.tsx  # Create & edit page (via ?id or /edit/:id)
            ├── FlatMenuPage.tsx    # Flat list view
            ├── TreeViewPage.tsx    # Nested tree with drag & drop + sort keys
            └── SidebarTreePage.tsx # Sidebar tree + path display
```

### Layered Architecture (Backend)

| Layer | Responsibility |
|-------|----------------|
| `cmd/server/main.go` | Wiring, env config, `ServeMux` routing, server lifecycle |
| `internal/handler/` | HTTP concerns: serialization, path params, status codes |
| `internal/service/` | Business logic, orchestration (thin pass-through today) |
| `internal/repository/` | SQL queries, data access, tree-building algorithms |
| `internal/database/` | SQLite connection, schema initialization |
| `internal/models/` | Data structures, DTOs, JSON tags |

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Go | 1.23+ | Backend server |
| Node.js | 18+ | Frontend dev server |
| npm | bundled with Node | Frontend package manager |
| GCC / cgo toolchain | required | `github.com/mattn/go-sqlite3` needs CGO |

### Verify toolchain

```bash
go version
node --version
npm --version
```

## Installation & Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd menu-tree-manager
```

### 2. Backend setup

```bash
cd backend
go mod tidy
go run ./cmd/server
```

The server starts on `http://localhost:8080` (or `$SERVER_ADDR`) and creates/uses `./data/menu.db` (or `$DB_PATH`).

### 3. Frontend setup

```bash
cd ../frontend
npm install
npm run dev        # dev server at http://localhost:5173
# or
npm run build      # production build to ./dist
npm run preview    # serve production build locally
npm run lint       # run oxlint
```

### 4. Verify both are running

```bash
# Backend health
curl http://localhost:8080/health
# => {"status":"ok"}

# Backend hello
curl http://localhost:8080/hello
# => {"message":"Hello, World!"}

# Frontend (open in browser)
open http://localhost:5173
```

### Quick end-to-end smoke test

```bash
# Create a root item
curl -X POST http://localhost:8080/api/menu \
  -H "Content-Type: application/json" \
  -d '{"name":"Dashboard","url":"/dashboard","icon":"home","sort_key":0}'

# Create a child item
curl -X POST http://localhost:8080/api/menu \
  -H "Content-Type: application/json" \
  -d '{"name":"Users","parent_id":1,"url":"/users","icon":"users","sort_key":0}'

# Fetch the nested tree
curl http://localhost:8080/api/menu/tree

# Update sort key via arrow-key-style API call
curl -X PUT http://localhost:8080/api/menu/2 \
  -H "Content-Type: application/json" \
  -d '{"sort_key":5}'
```

## Configuration

Configuration is done entirely through environment variables. No config files are required.

### Backend environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_ADDR` | `:8080` | TCP address the HTTP server listens on |
| `DB_PATH` | `./data/menu.db` | Path to the SQLite database file |

Example:

```bash
SERVER_ADDR=:9090 DB_PATH=/tmp/menu.db go run ./cmd/server
```

### Frontend environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8080` | Base URL for the backend API |

Create a `.env` file in `frontend/`:

```ini
VITE_API_URL=http://localhost:8080
```

## API Reference

Base path: `/api/menu`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/menu` | Create a menu item |
| `GET` | `/api/menu/tree` | Get the full nested tree |
| `GET` | `/api/menu/flat` | Get all items in a flat list |
| `GET` | `/api/menu/{id}` | Get a single item by ID |
| `GET` | `/api/menu/{parentId}/children` | Get direct children of a parent |
| `PUT` | `/api/menu/{id}` | Partially update an item |
| `DELETE` | `/api/menu/{id}` | Delete an item (cascades to children) |
| `POST` | `/api/menu/reorder` | Bulk reorder siblings by ordered ID list |
| `POST` | `/api/menu/{id}/move` | Move an item to a new parent at a position |

Also available (non-menu): `GET /hello`, `GET /health`.

### Request / Response Models

**CreateMenuItemRequest**
```json
{
  "name": "string (required)",
  "parent_id": "integer|null (optional)",
  "sort_key": "integer (optional)",
  "url": "string (optional)",
  "icon": "string (optional)",
  "is_active": "boolean (optional)"
}
```

**UpdateMenuItemRequest** (all fields optional)
```json
{
  "name": "string",
  "parent_id": "integer|null",
  "sort_key": "integer",
  "url": "string",
  "icon": "string",
  "is_active": "boolean"
}
```

**MoveMenuItemRequest**
```json
{
  "parent_id": "integer|null",
  "sort_key": "integer"
}
```

**MenuItem** (response)
```json
{
  "id": 1,
  "name": "Dashboard",
  "parent_id": null,
  "sort_key": 0,
  "url": "/dashboard",
  "icon": "home",
  "is_active": true,
  "created_at": "2026-10-13T11:56:52Z",
  "updated_at": "2026-10-13T11:56:52Z",
  "children": [...]
}
```

**MenuTreeResponse**
```json
{
  "items": [MenuItem, ...],
  "total": 1
}
```

### Example: Create with child, then reorder

```bash
# Root item
curl -X POST http://localhost:8080/api/menu \
  -H "Content-Type: application/json" \
  -d '{"name":"Settings","sort_key":0}'   # id: 3

# Two children
curl -X POST http://localhost:8080/api/menu \
  -H "Content-Type: application/json" \
  -d '{"name":"Profile","parent_id":3,"sort_key":0}'      # id: 4
curl -X POST http://localhost:8080/api/menu \
  -H "Content-Type: application/json" \
  -d '{"name":"Account","parent_id":3,"sort_key":1}'      # id: 5

# Reorder children: Account first, Profile second
curl -X POST http://localhost:8080/api/menu/reorder \
  -H "Content-Type: application/json" \
  -d '{"parent_id":3,"items":[5,4]}'

# Move Profile under Dashboard (id: 1)
curl -X POST http://localhost:8080/api/menu/4/move \
  -H "Content-Type: application/json" \
  -d '{"parent_id":1,"sort_key":0}'
```

### Example: Adjust sort key via PUT

```bash
# Increment (ArrowDown equivalent)
curl -X PUT http://localhost:8080/api/menu/4 \
  -H "Content-Type: application/json" \
  -d '{"sort_key":1}'

# Decrement (ArrowUp equivalent)
curl -X PUT http://localhost:8080/api/menu/4 \
  -H "Content-Type: application/json" \
  -d '{"sort_key":0}'
```

## Frontend Usage

### Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | Dashboard | Welcome page with navigation cards |
| `/menu` | FlatMenuPage | Flat list of all items with depth, status, actions |
| `/create` | CreateMenuPage | Create a new menu item |
| `/edit/:id` | CreateMenuPage | Edit an existing item (pre-populated) |
| `/tree` | TreeViewPage | Nested collapsible tree with drag-and-drop + sort buttons |
| `/sidebar` | SidebarTreePage | Sidebar tree; main pane shows selected item's path |

### Page behaviors

**FlatMenuPage**
- Renders all items sorted by depth then `sort_key`
- Depth computed at load time by walking `parent_id` chains
- Edit link opens `/edit/:id`; delete triggers cascade confirmation

**CreateMenuPage**
- Reads `id` from query param (`?id=`) or route param (`/edit/:id`)
- In edit mode, fetches the item via `GET /api/menu/{id}` and pre-populates the form
- Submits `PUT /api/menu/{id}` in edit mode, `POST /api/menu` in create mode
- Client-side validation: name required (create), name non-empty (edit), URL format check

**TreeViewPage**
- Nested tree with expand/collapse toggles
- Drag-and-drop restricted to leaf nodes (items without children)
- Drop target validation prevents moving a parent into its own descendant
- Up/Down buttons swap the item's `sort_key` with the adjacent sibling
- Focused node supports `ArrowUp` / `ArrowDown` to decrement/increment `sort_key`
- After any successful move/update, the tree is refetched and re-rendered

**SidebarTreePage**
- Tree in a left `<aside>`; main `<main>` pane
- Clicking a node sets `selectedItem` and displays its computed path as `<code>` (e.g. `/Settings/Profile`)
- Path is built dynamically by walking parent IDs in the flat item list — no stored path column

### Sort key management

The `sort_key` column determines sibling ordering (ascending). Lower values appear first.

- **Create**: omitted `sort_key` defaults to `0` in the DB; explicit values are honored. Auto-assignment uses `MAX(sort_key) + 1` per parent when needed.
- **Update**: `PUT /api/menu/{id}` with `{ "sort_key": N }` sets an explicit value (negative or large values are accepted).
- **Reorder**: `POST /api/menu/reorder` with an ordered `items` array assigns `0..n-1` sequentially.
- **Move**: `POST /api/menu/{id}/move` relocates the item; `sort_key` is set to `0` at the new parent unless overridden.
- **Frontend**: Up/Down buttons and arrow keys read the current `sort_key`, compute ±1, and dispatch `PUT /api/menu/{id}`.

## Database Schema

```sql
CREATE TABLE menu_items (
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
```

### Design decisions

| Decision | Rationale |
|----------|-----------|
| Adjacency list (`parent_id`) | Simple, standard SQL, easy to understand, good for shallow trees |
| `sort_key` default `0` | New items append to the end of their sibling group |
| `ON DELETE CASCADE` | Deleting a parent removes its entire subtree automatically |
| `is_active` boolean | Soft-delete / visibility toggle without data loss |
| `url` and `icon` fields | Frontend-ready for navigation menus |
| Indexes on `(parent_id, sort_key)` | Optimize tree reads and sibling ordering |

### Circular reference prevention

On create, update, and move, the repository walks up from the proposed new parent to the root. If the item's own ID is encountered, the request is rejected with `409 Conflict`. Self-parenting is also explicitly blocked.

## Scripts

### Backend

```bash
cd backend
go mod tidy          # ensure dependencies
go build ./...       # compile all packages
go run ./cmd/server  # run dev server
```

### Frontend

```bash
cd frontend
npm install          # install dependencies
npm run dev          # start Vite dev server (hot reload)
npm run build        # TypeScript check + Vite production build
npm run preview      # serve production build locally
npm run lint         # run oxlint
```

## Contributing

1. Fork the repository and create a feature branch from `main`.
2. Follow the existing layered architecture: models → repository → service → handler.
3. For new database fields: add to `MenuItem` struct, update schema SQL, update repository scans.
4. For new endpoints: add repository method, expose via service, register route in `main.go`.
5. For frontend changes: keep components small and shared (e.g., `MenuForm`), use `menuApi` for all backend calls.
6. Run `go build ./...` and `npm run build` before submitting.
7. Open a pull request with a clear description of changes.

## License

This project is provided as-is under the MIT License. See the repository LICENSE file for details.

---

**Menu Tree Manager** — hierarchical menu management with a Go API and React UI.