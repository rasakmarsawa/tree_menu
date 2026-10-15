import type { MenuItem, CreateMenuItemRequest, UpdateMenuItemRequest, MenuTreeResponse, MenuFlatResponse } from '../types/menu';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const menuApi = {
  create: (data: CreateMenuItemRequest) =>
    fetchJson<MenuItem>('/api/menu', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getTree: () =>
    fetchJson<MenuTreeResponse>('/api/menu/tree'),

  getFlat: () =>
    fetchJson<MenuFlatResponse>('/api/menu/flat'),

  getById: (id: number) =>
    fetchJson<MenuItem>(`/api/menu/${id}`),

  getChildren: (parentId: number) =>
    fetchJson<MenuFlatResponse>(`/api/menu/${parentId}/children`),

  update: (id: number, data: UpdateMenuItemRequest) =>
    fetchJson<MenuItem>(`/api/menu/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetchJson<void>(`/api/menu/${id}`, {
      method: 'DELETE',
    }),

  reorder: (parentId: number | null, items: number[]) =>
    fetchJson<void>('/api/menu/reorder', {
      method: 'POST',
      body: JSON.stringify({ parent_id: parentId, items }),
    }),

  move: (id: number, parentId: number | null, sortKey: number) =>
    fetchJson<void>(`/api/menu/${id}/move`, {
      method: 'POST',
      body: JSON.stringify({ parent_id: parentId, sort_key: sortKey }),
    }),
};