package service

import (
	"github.com/example/backend/internal/models"
	"github.com/example/backend/internal/repository"
)

type MenuService struct {
	repo *repository.MenuRepository
}

func NewMenuService(repo *repository.MenuRepository) *MenuService {
	return &MenuService{repo: repo}
}

func (s *MenuService) Create(req *models.CreateMenuItemRequest) (*models.MenuItem, error) {
	return s.repo.Create(req)
}

func (s *MenuService) GetByID(id int64) (*models.MenuItem, error) {
	return s.repo.GetByID(id)
}

func (s *MenuService) GetTree() ([]*models.MenuItem, error) {
	return s.repo.GetTree()
}

func (s *MenuService) GetFlattened() ([]*models.MenuItem, error) {
	return s.repo.GetAll()
}

func (s *MenuService) GetChildren(parentID int64) ([]*models.MenuItem, error) {
	return s.repo.GetChildren(parentID)
}

func (s *MenuService) Update(id int64, req *models.UpdateMenuItemRequest) (*models.MenuItem, error) {
	return s.repo.Update(id, req)
}

func (s *MenuService) Delete(id int64) error {
	return s.repo.Delete(id)
}

func (s *MenuService) Reorder(parentID *int64, itemIDs []int64) error {
	return s.repo.Reorder(parentID, itemIDs)
}

func (s *MenuService) MoveItem(itemID int64, newParentID *int64, newSortKey int) error {
	return s.repo.MoveItem(itemID, newParentID, newSortKey)
}