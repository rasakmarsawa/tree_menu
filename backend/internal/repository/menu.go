package repository

import (
	"database/sql"
	"errors"
	"fmt"

	"github.com/example/backend/internal/models"
)

var (
	ErrNotFound          = errors.New("menu item not found")
	ErrCircularReference = errors.New("circular reference detected")
	ErrInvalidParent     = errors.New("invalid parent ID")
)

type MenuRepository struct {
	db *sql.DB
}

func NewMenuRepository(db *sql.DB) *MenuRepository {
	return &MenuRepository{db: db}
}

func (r *MenuRepository) Create(req *models.CreateMenuItemRequest) (*models.MenuItem, error) {
	if req.ParentID != nil {
		if err := r.validateParent(*req.ParentID); err != nil {
			return nil, err
		}
		if req.ParentID != nil && *req.ParentID == 0 {
			return nil, ErrInvalidParent
		}
		if req.ParentID != nil {
			if err := r.checkCircularReference(0, *req.ParentID); err != nil {
				return nil, err
			}
		}
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	sortKey := req.SortKey
	if sortKey == 0 {
		sortKey = r.getNextSortKey(req.ParentID)
	}

	query := `
		INSERT INTO menu_items (name, parent_id, sort_key, url, icon, is_active)
		VALUES (?, ?, ?, ?, ?, ?)
	`
	result, err := r.db.Exec(query, req.Name, req.ParentID, sortKey, req.URL, req.Icon, isActive)
	if err != nil {
		return nil, fmt.Errorf("failed to create menu item: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get last insert ID: %w", err)
	}

	return r.GetByID(id)
}

func (r *MenuRepository) GetByID(id int64) (*models.MenuItem, error) {
	query := `
		SELECT id, name, parent_id, sort_key, url, icon, is_active, created_at, updated_at
		FROM menu_items
		WHERE id = ?
	`
	row := r.db.QueryRow(query, id)

	item := &models.MenuItem{}
	var parentID sql.NullInt64
	err := row.Scan(
		&item.ID,
		&item.Name,
		&parentID,
		&item.SortKey,
		&item.URL,
		&item.Icon,
		&item.IsActive,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("failed to get menu item: %w", err)
	}

	if parentID.Valid {
		item.ParentID = &parentID.Int64
	}

	return item, nil
}

func (r *MenuRepository) GetAll() ([]*models.MenuItem, error) {
	query := `
		SELECT id, name, parent_id, sort_key, url, icon, is_active, created_at, updated_at
		FROM menu_items
		ORDER BY parent_id NULLS FIRST, sort_key, id
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to get all menu items: %w", err)
	}
	defer rows.Close()

	var items []*models.MenuItem
	for rows.Next() {
		item := &models.MenuItem{}
		var parentID sql.NullInt64
		err := rows.Scan(
			&item.ID,
			&item.Name,
			&parentID,
			&item.SortKey,
			&item.URL,
			&item.Icon,
			&item.IsActive,
			&item.CreatedAt,
			&item.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan menu item: %w", err)
		}
		if parentID.Valid {
			item.ParentID = &parentID.Int64
		}
		items = append(items, item)
	}

	return items, nil
}

func (r *MenuRepository) GetTree() ([]*models.MenuItem, error) {
	items, err := r.GetAll()
	if err != nil {
		return nil, err
	}

	return r.buildTree(items), nil
}

func (r *MenuRepository) GetChildren(parentID int64) ([]*models.MenuItem, error) {
	query := `
		SELECT id, name, parent_id, sort_key, url, icon, is_active, created_at, updated_at
		FROM menu_items
		WHERE parent_id = ?
		ORDER BY sort_key, id
	`
	rows, err := r.db.Query(query, parentID)
	if err != nil {
		return nil, fmt.Errorf("failed to get children: %w", err)
	}
	defer rows.Close()

	var items []*models.MenuItem
	for rows.Next() {
		item := &models.MenuItem{}
		var pid sql.NullInt64
		err := rows.Scan(
			&item.ID,
			&item.Name,
			&pid,
			&item.SortKey,
			&item.URL,
			&item.Icon,
			&item.IsActive,
			&item.CreatedAt,
			&item.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan child: %w", err)
		}
		if pid.Valid {
			item.ParentID = &pid.Int64
		}
		items = append(items, item)
	}

	return items, nil
}

func (r *MenuRepository) Update(id int64, req *models.UpdateMenuItemRequest) (*models.MenuItem, error) {
	existing, err := r.GetByID(id)
	if err != nil {
		return nil, err
	}

	if req.ParentID != nil {
		if *req.ParentID == id {
			return nil, ErrCircularReference
		}
		if err := r.validateParent(*req.ParentID); err != nil {
			return nil, err
		}
		if err := r.checkCircularReference(id, *req.ParentID); err != nil {
			return nil, err
		}
		existing.ParentID = req.ParentID
	}

	if req.Name != nil {
		existing.Name = *req.Name
	}
	if req.SortKey != nil {
		existing.SortKey = *req.SortKey
	}
	if req.URL != nil {
		existing.URL = *req.URL
	}
	if req.Icon != nil {
		existing.Icon = *req.Icon
	}
	if req.IsActive != nil {
		existing.IsActive = *req.IsActive
	}

	query := `
		UPDATE menu_items
		SET name = ?, parent_id = ?, sort_key = ?, url = ?, icon = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`
	_, err = r.db.Exec(query, existing.Name, existing.ParentID, existing.SortKey, existing.URL, existing.Icon, existing.IsActive, id)
	if err != nil {
		return nil, fmt.Errorf("failed to update menu item: %w", err)
	}

	return r.GetByID(id)
}

func (r *MenuRepository) Delete(id int64) error {
	result, err := r.db.Exec("DELETE FROM menu_items WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("failed to delete menu item: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get rows affected: %w", err)
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

func (r *MenuRepository) Reorder(parentID *int64, itemIDs []int64) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	for i, itemID := range itemIDs {
		_, err := tx.Exec("UPDATE menu_items SET sort_key = ?, parent_id = ? WHERE id = ?", i, parentID, itemID)
		if err != nil {
			return fmt.Errorf("failed to reorder item %d: %w", itemID, err)
		}
	}

	return tx.Commit()
}

func (r *MenuRepository) MoveItem(itemID int64, newParentID *int64, newSortKey int) error {
	if newParentID != nil && itemID == *newParentID {
		return ErrCircularReference
	}

	if newParentID != nil {
		if err := r.checkCircularReference(itemID, *newParentID); err != nil {
			return err
		}
		if err := r.validateParent(*newParentID); err != nil {
			return err
		}
	}

	query := `UPDATE menu_items SET parent_id = ?, sort_key = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
	_, err := r.db.Exec(query, newParentID, newSortKey, itemID)
	if err != nil {
		return fmt.Errorf("failed to move item: %w", err)
	}

	return nil
}

func (r *MenuRepository) buildTree(items []*models.MenuItem) []*models.MenuItem {
	itemMap := make(map[int64]*models.MenuItem)
	var roots []*models.MenuItem

	for _, item := range items {
		itemMap[item.ID] = item
		item.Children = []*models.MenuItem{}
	}

	for _, item := range items {
		if item.ParentID == nil {
			roots = append(roots, item)
		} else {
			if parent, ok := itemMap[*item.ParentID]; ok {
				parent.Children = append(parent.Children, item)
			} else {
				roots = append(roots, item)
			}
		}
	}

	return roots
}

func (r *MenuRepository) validateParent(parentID int64) error {
	var exists bool
	err := r.db.QueryRow("SELECT EXISTS(SELECT 1 FROM menu_items WHERE id = ?)", parentID).Scan(&exists)
	if err != nil {
		return fmt.Errorf("failed to validate parent: %w", err)
	}
	if !exists {
		return ErrInvalidParent
	}
	return nil
}

func (r *MenuRepository) checkCircularReference(itemID, newParentID int64) error {
	currentID := newParentID
	for currentID != 0 {
		if currentID == itemID {
			return ErrCircularReference
		}
		var parentID sql.NullInt64
		err := r.db.QueryRow("SELECT parent_id FROM menu_items WHERE id = ?", currentID).Scan(&parentID)
		if err != nil {
			if err == sql.ErrNoRows {
				break
			}
			return fmt.Errorf("failed to check circular reference: %w", err)
		}
		if parentID.Valid {
			currentID = parentID.Int64
		} else {
			break
		}
	}
	return nil
}

func (r *MenuRepository) getNextSortKey(parentID *int64) int {
	var maxSortKey int
	query := "SELECT COALESCE(MAX(sort_key), -1) + 1 FROM menu_items WHERE parent_id IS ?"
	if parentID != nil {
		query = "SELECT COALESCE(MAX(sort_key), -1) + 1 FROM menu_items WHERE parent_id = ?"
		err := r.db.QueryRow(query, *parentID).Scan(&maxSortKey)
		if err != nil {
			return 0
		}
	} else {
		err := r.db.QueryRow("SELECT COALESCE(MAX(sort_key), -1) + 1 FROM menu_items WHERE parent_id IS NULL").Scan(&maxSortKey)
		if err != nil {
			return 0
		}
	}
	return maxSortKey
}