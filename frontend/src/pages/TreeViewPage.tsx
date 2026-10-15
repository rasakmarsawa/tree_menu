import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { menuApi } from '../api/menu';
import type { MenuItem } from '../types/menu';

interface TreeNodeProps {
  item: MenuItem;
  depth?: number;
  onMove: (itemId: number, newParentId: number | null) => void;
  onSort: (itemId: number, newSortKey: number) => void;
  isDragging: boolean;
  dragOverId: number | null;
  setDragOverId: (id: number | null) => void;
  rootItems: MenuItem[];
}

function TreeNode({ 
  item, 
  depth = 0, 
  onMove, 
  onSort,
  isDragging, 
  dragOverId,
  setDragOverId,
  rootItems
}: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const isLeaf = !hasChildren;

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!isLeaf) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', String(item.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(item.id);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only clear if we're actually leaving the element (not entering a child)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverId(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    
    const draggedId = Number(e.dataTransfer.getData('text/plain'));
    if (draggedId === item.id) return;
    
    // Prevent circular reference - can't move parent into child
    if (isDescendant(item.id, draggedId, rootItems)) {
      return;
    }

    // Calculate sort key: append to end of target's children
    
    onMove(draggedId, item.id);
  };

  const isDescendant = (ancestorId: number, descendantId: number, items: MenuItem[]): boolean => {
    const findItem = (id: number, items: MenuItem[]): MenuItem | undefined => {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
          const found = findItem(id, item.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    const descendant = findItem(descendantId, items);
    if (!descendant) return false;
    
    let current = descendant;
    while (current.parent_id) {
      if (current.parent_id === ancestorId) return true;
      current = findItem(current.parent_id, items)!;
      if (!current) break;
    }
    return false;
  };

  const [sortKey, setSortKey] = useState(item.sort_key);

  useEffect(() => {
    setSortKey(item.sort_key);
  }, [item.sort_key]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newKey = sortKey + 1;
      setSortKey(newKey);
      onSort(item.id, newKey);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newKey = Math.max(0, sortKey - 1);
      setSortKey(newKey);
      onSort(item.id, newKey);
    }
  };


  const nodeStyle = {
    paddingLeft: `${depth * 20}px`,
    opacity: isDragging ? 0.5 : 1,
    backgroundColor: dragOverId === item.id ? 'var(--color-primary-light, #e3f2fd)' : 'transparent',
  };

  return (
    <div className="tree-node">
      <div 
        className={`tree-node-header ${isLeaf ? 'leaf' : ''} ${isDragging ? 'dragging' : ''} ${dragOverId === item.id ? 'drag-over' : ''}`}
        style={nodeStyle}
        draggable={isLeaf}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {hasChildren && (
          <button
            className={`expand-toggle ${expanded ? 'expanded' : 'collapsed'}`}
            onClick={toggleExpand}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            aria-expanded={expanded}
            draggable={false}
          >
            {expanded ? '▼' : '▶'}
          </button>
        )}
        {!hasChildren && <span className="expand-placeholder drag-handle" />}

        <span className="node-name" title={item.url}>
          {item.name}
        </span>

        <span className={`node-status ${item.is_active ? 'active' : 'inactive'}`}>
          {item.is_active ? 'Active' : 'Inactive'}
        </span>

        <span className="node-meta">
          Sort: {item.sort_key}
          {item.url && <span className="node-url">{item.url}</span>}
        </span>

      </div>

      {hasChildren && expanded && (
        <div className="tree-children">
          {item.children!.map((child) => (
            <TreeNode 
              key={child.id} 
              item={child} 
              depth={depth + 1} 
              onMove={onMove}
              onSort={onSort}
              isDragging={isDragging}
              dragOverId={dragOverId}
              setDragOverId={setDragOverId}
              rootItems={rootItems}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TreeViewPage() {
  const [tree, setTree] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const rootItemsRef = useRef<MenuItem[]>([]);

  useEffect(() => {
    const fetchTree = async () => {
      try {
        setLoading(true);
        const response = await menuApi.getTree();
        setTree(response.items);
        rootItemsRef.current = response.items;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load menu tree');
      } finally {
        setLoading(false);
      }
    };
    fetchTree();
  }, []);

  const handleMove = useCallback(async (itemId: number, newParentId: number | null) => {
    try {
      await menuApi.move(itemId, newParentId, 0);
      // Refresh the tree after successful move
      const response = await menuApi.getTree();
      setTree(response.items);
      rootItemsRef.current = response.items;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move item');
      setTimeout(() => setError(null), 5000);
    }
  }, []);


  const handleSort = useCallback(async (itemId: number, newSortKey: number) => {
    try {
      await menuApi.update(itemId, { sort_key: newSortKey });
      const response = await menuApi.getTree();
      setTree(response.items);
      rootItemsRef.current = response.items;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update sort key');
      setTimeout(() => setError(null), 5000);
    }
  }, []);

  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(0); // 0 represents root
  };

  const handleRootDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverId(null);
    }
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(null);
    
    const draggedId = Number(e.dataTransfer.getData('text/plain'));
    if (!draggedId) return;

    handleMove(draggedId, null);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverId(null);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading menu tree...</div>
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
        <h1>Menu Tree</h1>
        <p>Hierarchical view of the menu structure (drag leaf nodes to reorder)</p>
      </header>

      <div className="tree-toolbar">
        <Link to="/create" className="btn btn-primary">
          Create New Item
        </Link>
      </div>

      {tree.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🌳</div>
          <p>No menu items found.</p>
          <Link to="/create" className="btn btn-primary">Create First Item</Link>
        </div>
      ) : (
        <div 
          className="tree-container"
          onDragOver={handleRootDragOver}
          onDragLeave={handleRootDragLeave}
          onDrop={handleRootDrop}
          onDragEnd={handleDragEnd}
        >
          <div className={`tree-root ${dragOverId === 0 ? 'drag-over-root' : ''}`} role="tree" aria-label="Menu tree">
            {tree.map((item) => (
              <TreeNode 
                key={item.id} 
                item={item} 
                onMove={handleMove}
                onSort={handleSort}
                isDragging={draggingId === item.id}
                dragOverId={dragOverId}
                setDragOverId={setDragOverId}
                rootItems={rootItemsRef.current}
              />
            ))}
          </div>
          {dragOverId === 0 && (
            <div className="root-drop-indicator">
              Drop here to make item a root-level item
            </div>
          )}
        </div>
      )}
    </div>
  );
}