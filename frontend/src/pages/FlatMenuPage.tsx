import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { menuApi } from '../api/menu';
import type { MenuItem } from '../types/menu';

export function FlatMenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        setLoading(true);
        const response = await menuApi.getFlat();
        setItems(response.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load menu');
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const getDepth = (item: MenuItem, allItems: MenuItem[]): number => {
    let depth = 0;
    let current = item;
    while (current.parent_id) {
      depth++;
      const parent = allItems.find(i => i.id === current.parent_id);
      if (!parent) break;
      current = parent;
    }
    return depth;
  };

  const sortedItems = [...items].sort((a, b) => {
    const depthA = getDepth(a, items);
    const depthB = getDepth(b, items);
    if (depthA !== depthB) return depthA - depthB;
    return a.sort_key - b.sort_key;
  });

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading menu items...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Menu Items (Flat List)</h1>
        <p>All menu items in a flat, sortable list</p>
      </header>

      <div className="toolbar">
        <Link to="/create" className="btn btn-primary">Create New Item</Link>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>No menu items found.</p>
          <Link to="/create" className="btn btn-primary">Create First Item</Link>
        </div>
      ) : (
        <div className="table-container">
          <table className="menu-table">
<thead>
              <tr>
                <th>Name</th>
                <th>Depth</th>
                <th>Parent</th>
                <th>Sort Key</th>
                <th>URL</th>
                <th>Icon</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => {
                const depth = getDepth(item, items);
                const parent = item.parent_id ? items.find(i => i.id === item.parent_id) : null;
                return (
                  <tr key={item.id}>
                    <td>
                      <span className="item-name">{item.name}</span>
                    </td>
                    <td>{depth}</td>
                    <td>{parent?.name || '<root>'}</td>
                    <td>{item.sort_key}</td>
                    <td>{item.url || '-'}</td>
                    <td>{item.icon || '-'}</td>
                    <td>
                      <span className={`status-badge ${item.is_active ? 'active' : 'inactive'}`}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Link to={`/edit/${item.id}`} className="btn btn-sm btn-secondary">Edit</Link>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(item.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

async function handleDelete(id: number) {
  if (!window.confirm('Are you sure you want to delete this item? This will also delete all child items.')) {
    return;
  }
  try {
    await menuApi.delete(id);
    window.location.reload();
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Failed to delete item');
  }
}