import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { MenuForm } from '../components/MenuForm';
import { menuApi } from '../api/menu';
import type { MenuItem, CreateMenuItemRequest } from '../types/menu';

export function CreateMenuPage() {
  const [searchParams] = useSearchParams();
  const params = useParams();
  const navigate = useNavigate();
  const routeId = params.id;
  const queryId = searchParams.get('id');
  const itemId = routeId ?? queryId;
  const isEditMode = itemId !== null && itemId !== undefined;

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialData, setInitialData] = useState<Partial<CreateMenuItemRequest> | null>(null);

  useEffect(() => {
    if (isEditMode && itemId) {
      const fetchItem = async () => {
        setLoading(true);
        try {
          const item = await menuApi.getById(Number(itemId));
          setInitialData({
            name: item.name,
            parent_id: item.parent_id ?? null,
            sort_key: item.sort_key,
            url: item.url ?? '',
            icon: item.icon ?? '',
            is_active: item.is_active,
          });
        } catch (err) {
          setErrorMessage(err instanceof Error ? err.message : 'Failed to load menu item');
        } finally {
          setLoading(false);
        }
      };
      fetchItem();
    }
  }, [itemId, isEditMode]);

  const handleSuccess = (item: MenuItem) => {
    const action = isEditMode ? 'updated' : 'created';
    setSuccessMessage(`Menu item "${item.name}" ${action} successfully!`);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 5000);
    if (!isEditMode) {
      navigate('/menu');
    }
  };

  const handleError = (error: Error) => {
    setErrorMessage(error.message);
    setSuccessMessage(null);
  };

  const pageTitle = useMemo(() => isEditMode ? 'Edit Menu Entry' : 'Create Menu Entry', [isEditMode]);
  const pageDescription = useMemo(() => isEditMode ? 'Modify an existing menu item' : 'Add a new item to the navigation menu', [isEditMode]);
  const submitLabel = useMemo(() => isEditMode ? 'Update' : 'Create', [isEditMode]);

  if (isEditMode && loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading menu item...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>{pageTitle}</h1>
        <p>{pageDescription}</p>
      </header>

      {successMessage && (
        <div className="alert alert-success" role="alert">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-error" role="alert">
          {errorMessage}
        </div>
      )}

      <main className="page-content">
        <MenuForm
          itemId={isEditMode && itemId ? Number(itemId) : undefined}
          initialData={initialData ?? undefined}
          onSuccess={handleSuccess}
          onError={handleError}
          submitLabel={submitLabel}
        />
      </main>
    </div>
  );
}