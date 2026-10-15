export interface MenuItem {
  id: number;
  name: string;
  parent_id?: number | null;
  sort_key: number;
  url?: string;
  icon?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: MenuItem[];
}

export interface CreateMenuItemRequest {
  name: string;
  parent_id?: number | null;
  sort_key?: number;
  url?: string;
  icon?: string;
  is_active?: boolean;
}

export interface UpdateMenuItemRequest {
  name?: string;
  parent_id?: number | null;
  sort_key?: number;
  url?: string;
  icon?: string;
  is_active?: boolean;
}

export interface MenuTreeResponse {
  items: MenuItem[];
  total: number;
}

export interface MenuFlatResponse {
  items: MenuItem[];
  total: number;
}