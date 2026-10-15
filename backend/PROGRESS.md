# Project Progress Documentation

## Project Overview
Minimal Go API server with a "Hello World" endpoint and an infinitely nested tree menu system using the adjacency list pattern with SQLite backend.

## Architecture

### Directory Structure
```
backend/
├── go.mod                          # Go module definition
├── go.sum                          # Dependency checksums
├── cmd/
│   └── server/
│       └── main.go                # Application entry point, HTTP server setup, DB init
├── internal/
│   ├── database/
│   │   └── database.go            # SQLite connection and schema initialization
│   ├── models/
│   │   └── menu.go                # MenuItem struct, request/response DTOs
│   ├── repository/
│   │   └── menu.go                # Data access layer (CRUD, tree building, reordering)
│   ├── service/
│   │   └── menu.go                # Business logic layer
│   └── handler/
│       ├── handler.go             # Original Hello/Health handlers
│       └── menu.go                # Tree menu HTTP handlers
└── PROGRESS.md                    # This file
```

### Design Principles
- **Standard Library First**: Uses only `net/http`, `database/sql`, `encoding/json` — minimal external deps
- **Package Organization**: Follows Go conventions with `cmd/` for entry points, `internal/` for private packages
- **Layered Architecture**: Handler → Service → Repository → Database
- **Adjacency List Pattern**: Tree structure via `parent_id` self-referential foreign key
- **Custom Ordering**: `sort_key` column with default 0 for sibling ordering
- **JSON API**: All responses return structured JSON with explicit Content-Type headers

## Database Schema

### Table: `menu_items`
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
```

### Indexes
- `idx_menu_items_parent_id` — Fast child lookups by parent
- `idx_menu_items_sort_key` — Ordered sibling retrieval (parent_id, sort_key)
- `idx_menu_items_is_active` — Filter active items

### Design Decisions
| Decision | Rationale |
|----------|-----------|
| Adjacency List | Simple, standard SQL, easy to understand, good for shallow trees |
| `sort_key` default 0 | New items append to end; explicit reordering when needed |
| `ON DELETE CASCADE` | Deleting parent removes children automatically |
| `is_active` boolean | Soft delete / visibility toggle without data loss |
| `url`, `icon` fields | Frontend-ready for navigation menus |

## Implementation Details

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/menu | Create menu item |
| GET | /api/menu/tree | Get full nested tree |
| GET | /api/menu/flat | Get all items flat (for admin) |
| GET | /api/menu/{id} | Get single item by ID |
| GET | /api/menu/{parentId}/children | Get direct children |
| PUT | /api/menu/{id} | Update item (partial) |
| DELETE | /api/menu/{id} | Delete item (cascades) |
| POST | /api/menu/reorder | Bulk reorder siblings |
| POST | /api/menu/{id}/move | Move item to new parent |

### Request/Response Examples

**Create Menu Item**
```bash
curl -X POST http://localhost:8080/api/menu \
  -H "Content-Type: application/json" \
  -d '{"name": "Dashboard", "url": "/dashboard", "icon": "home", "sort_key": 0}'
```

**Get Full Tree**
```bash
curl http://localhost:8080/api/menu/tree
# Returns nested structure with children arrays
```

**Reorder Siblings**
```bash
curl -X POST http://localhost:8080/api/menu/reorder \
  -H "Content-Type: application/json" \
  -d '{"parent_id": 1, "items": [3, 1, 2]}'
```

**Move Item to New Parent**
```bash
curl -X POST http://localhost:8080/api/menu/2/move \
  -H "Content-Type: application/json" \
  -d '{"parent_id": 5, "sort_key": 0}'
```

### Tree Building Algorithm
The repository uses an O(n) single-pass algorithm:
1. Fetch all items flat, ordered by `parent_id, sort_key`
2. Create map `id -> *MenuItem` for O(1) lookups
3. Iterate items: attach to parent's `Children` slice or add to roots
4. Returns `[]*MenuItem` (forest of root nodes)

### Circular Reference Prevention
- On create/update/move: traverse up from new parent to root
- If target item ID encountered → reject with 409 Conflict
- Self-parenting (item → itself) explicitly blocked

### Sort Key Management
- Auto-assigned on create: `MAX(sort_key) + 1` for given parent
- Explicit `sort_key` in create request honored
- `Reorder` endpoint accepts ordered ID array, assigns 0..n
- `Move` endpoint accepts explicit `sort_key` for new position

## Current Development Status

### Completed
- [x] Go module initialization (`go.mod`)
- [x] Project directory structure
- [x] HTTP server with `ServeMux` routing
- [x] `/hello` and `/health` endpoints
- [x] SQLite database with adjacency list schema
- [x] `sort_key` column with default 0
- [x] Full CRUD for menu items
- [x] Nested tree retrieval (`/tree`)
- [x] Flat list retrieval (`/flat`)
- [x] Direct children retrieval
- [x] Partial updates (PATCH-like via PUT)
- [x] Cascade delete
- [x] Bulk reorder siblings
- [x] Move item to new parent with position
- [x] Circular reference detection
- [x] Environment-configurable DB path and server address

### Pending / Future Work
- [ ] Unit tests for handlers, service, repository
- [ ] Integration tests with test database
- [ ] Graceful shutdown with signal handling
- [ ] Structured logging (e.g., `slog`)
- [ ] Request/response middleware (logging, CORS, recovery)
- [ ] Input validation (e.g., `go-playground/validator`)
- [ ] Pagination for flat list
- [ ] Search/filter endpoints
- [ ] Depth limit configuration
- [ ] Materialized path or closure table for deep trees
- [ ] Dockerfile for containerization
- [ ] Makefile or Taskfile for common commands
- [ ] API versioning strategy
- [ ] OpenAPI/Swagger documentation

## Running the Project

```bash
cd backend
go run ./cmd/server
```

Server starts on `http://localhost:8080` (configurable via `SERVER_ADDR` env)
Database at `./data/menu.db` (configurable via `DB_PATH` env)

### Test Endpoints
```bash
# Original endpoints
curl http://localhost:8080/hello
# {"message":"Hello, World!"}

curl http://localhost:8080/health
# {"status":"ok"}

# Tree menu endpoints
curl -X POST http://localhost:8080/api/menu \
  -H "Content-Type: application/json" \
  -d '{"name": "Dashboard", "url": "/dashboard", "icon": "home"}'

curl -X POST http://localhost:8080/api/menu \
  -H "Content-Type: application/json" \
  -d '{"name": "Users", "parent_id": 1, "url": "/users"}'

curl http://localhost:8080/api/menu/tree
# Nested JSON tree

curl http://localhost:8080/api/menu/flat
# Flat list for admin tables
```

## Context for AI Agents

This project uses a layered architecture. When extending:
1. **Models** (`internal/models/`): Data structures, DTOs, validation tags
2. **Repository** (`internal/repository/`): SQL queries, data access, tree algorithms
3. **Service** (`internal/service/`): Business logic, transactions, orchestration
4. **Handler** (`internal/handler/`): HTTP concerns, serialization, status codes
5. **Main** (`cmd/server/main.go`): Wiring, config, server lifecycle

### Tree-Specific Guidance
- **Adjacency list** is simple but O(depth) for ancestry queries. For deep trees (>100 levels), consider materialized path or closure table.
- **Sort key** enables custom ordering without gaps. Use `Reorder` for drag-and-drop UIs.
- **Circular reference check** walks up the tree. For very deep trees, consider recursive CTE.
- **Cascade delete** removes subtree. Add soft-delete if audit trail needed.
- **Indexes** on `(parent_id, sort_key)` optimize tree reads.

### Adding Features
- New fields → add to `MenuItem` struct, migration SQL, repository scans
- New queries → add to repository, expose via service, add handler route
- New algorithms (e.g., path enumeration) → add to repository, keep service thin