package models

import "time"

type MenuItem struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	ParentID  *int64    `json:"parent_id,omitempty"`
	SortKey   int       `json:"sort_key"`
	URL       string    `json:"url,omitempty"`
	Icon      string    `json:"icon,omitempty"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
	Children  []*MenuItem `json:"children,omitempty"`
}

type CreateMenuItemRequest struct {
	Name     string  `json:"name" binding:"required"`
	ParentID *int64  `json:"parent_id,omitempty"`
	SortKey  int     `json:"sort_key,omitempty"`
	URL      string  `json:"url,omitempty"`
	Icon     string  `json:"icon,omitempty"`
	IsActive *bool   `json:"is_active,omitempty"`
}

type UpdateMenuItemRequest struct {
	Name     *string `json:"name,omitempty"`
	ParentID *int64  `json:"parent_id,omitempty"`
	SortKey  *int    `json:"sort_key,omitempty"`
	URL      *string `json:"url,omitempty"`
	Icon     *string `json:"icon,omitempty"`
	IsActive *bool   `json:"is_active,omitempty"`
}

type MoveMenuItemRequest struct {
	ParentID *int64 `json:"parent_id,omitempty"`
	SortKey  int    `json:"sort_key"`
}

type MenuTreeResponse struct {
	Items []*MenuItem `json:"items"`
	Total int         `json:"total"`
}

func (m *MenuItem) IsRoot() bool {
	return m.ParentID == nil
}

func (m *MenuItem) HasChildren() bool {
	return len(m.Children) > 0
}