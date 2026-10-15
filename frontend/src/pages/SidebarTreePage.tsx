import { useState, useEffect } from 'react';
import { menuApi } from '../api/menu';
import type { MenuItem } from '../types/menu';

interface TreeNodeProps {
  item: MenuItem;
  depth?: number;
  onSelect: (item: MenuItem) => void;
  selectedId?: number;
}

function TreeNode({ item, depth = 0, onSelect, selectedId }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const isSelected = selectedId === item.id;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(item);
  };

  return (
    <div className="tree-node">
      <div 
        className={`tree-node-header ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${depth * 20}px` }}
        onClick={handleClick}
      >
        {hasChildren && (
          <button
            className={`expand-toggle ${expanded ? 'expanded' : 'collapsed'}`}
            onClick={toggleExpand}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            aria-expanded={expanded}
          >
            {expanded ? '▼' : '▶'}
          </button>
        )}
        {!hasChildren && <span className="expand-placeholder" />}

        <span className="node-name" title={item.url}>
          {item.name}
        </span>
      </div>

      {hasChildren && expanded && (
        <div className="tree-children">
          {item.children!.map((child) => (
            <TreeNode key={child.id} item={child} depth={depth + 1} onSelect={onSelect} selectedId={selectedId} />
          ))}
        </div>
      )}
    </div>
  );
}

function getPath(item: MenuItem, allItems: MenuItem[]): string {
  const parts: string[] = [item.name];
  let current = item;
  while (current.parent_id) {
    const parent = allItems.find(i => i.id === current.parent_id);
    if (!parent) break;
    parts.unshift(parent.name);
    current = parent;
  }
  return '/' + parts.join('/');
}

export function SidebarTreePage() {
  const [tree, setTree] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [allItems, setAllItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [treeResponse, flatResponse] = await Promise.all([
          menuApi.getTree(),
          menuApi.getFlat(),
        ]);
        setTree(treeResponse.items);
        setAllItems(flatResponse.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load menu');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSelect = (item: MenuItem) => {
    setSelectedItem(item);
  };

  if (loading) {
    return (
      <div className="sidebar-layout">
        <aside className="sidebar">
          <div className="loading">Loading...</div>
        </aside>
        <main className="main-content">
          <div className="loading">Loading...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sidebar-layout">
        <aside className="sidebar">
          <div className="alert alert-error">{error}</div>
        </aside>
        <main className="main-content">
          <div className="alert alert-error">{error}</div>
        </main>
      </div>
    );
  }

  const selectedPath = selectedItem ? getPath(selectedItem, allItems) : null;

  return (
    <div className="sidebar-layout">
      <aside className="sidebar">
        <header className="sidebar-header">
          <h2>Menu Tree</h2>
        </header>
        <nav className="sidebar-nav" role="tree" aria-label="Menu tree">
          {tree.length === 0 ? (
            <div className="empty-state">
              <p>No menu items found.</p>
            </div>
          ) : (
            tree.map((item) => (
              <TreeNode key={item.id} item={item} onSelect={handleSelect} selectedId={selectedItem?.id} />
            ))
          )}
        </nav>
      </aside>
      <main className="main-content">
        {selectedPath ? (
          <div className="path-display">
            <code>{selectedPath}</code>
          </div>
        ) : (
          <div className="path-placeholder">
            <p>Select a menu item from the tree to view its path</p>
          </div>
        )}
      </main>
    </div>
  );
}