import { useState, useEffect } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import type { MenuItem, CreateMenuItemRequest, UpdateMenuItemRequest } from '../types/menu';
import { menuApi } from '../api/menu';

interface MenuFormProps {
  initialData?: Partial<CreateMenuItemRequest>;
  itemId?: number;
  onSuccess?: (item: MenuItem) => void;
  onError?: (error: Error) => void;
  submitLabel?: string;
}

export function MenuForm({
  initialData = {},
  itemId,
  onSuccess,
  onError,
  submitLabel = 'Create',
}: MenuFormProps) {
  const isEditMode = itemId !== undefined;
  const [formData, setFormData] = useState<CreateMenuItemRequest | UpdateMenuItemRequest>({
    name: '',
    parent_id: null,
    sort_key: 0,
    url: '',
    icon: '',
    is_active: true,
    ...initialData,
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parentOptions, setParentOptions] = useState<MenuItem[]>([]);

  useEffect(() => {
    const fetchParents = async () => {
      try {
        const response = await menuApi.getFlat();
        setParentOptions(response.items);
      } catch {
        // Silently fail - parent selection is optional
      }
    };
    fetchParents();
  }, []);

  const validate = (data: CreateMenuItemRequest | UpdateMenuItemRequest): boolean => {
    const newErrors: Partial<Record<string, string>> = {};

    if (isEditMode) {
      const updateData = data as UpdateMenuItemRequest;
      if (updateData.name !== undefined && !updateData.name.trim()) {
        newErrors.name = 'Name cannot be empty';
      }
    } else {
      const createData = data as CreateMenuItemRequest;
      if (!createData.name.trim()) {
        newErrors.name = 'Name is required';
      }
    }

    if (data.url && !isValidUrl(data.url)) {
      newErrors.url = 'Invalid URL format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url.startsWith('http') ? url : `http://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let newValue: string | number | boolean | null = type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : value;

    if (name === 'parent_id') {
      newValue = value === '' ? null : Number(value);
    } else if (name === 'sort_key') {
      newValue = value === '' ? 0 : Number(value);
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate(formData)) return;

    setIsSubmitting(true);
    try {
      let item: MenuItem;
      if (isEditMode && itemId !== undefined) {
        item = await menuApi.update(itemId, formData as UpdateMenuItemRequest);
      } else {
        item = await menuApi.create(formData as CreateMenuItemRequest);
      }
      onSuccess?.(item);
      if (!isEditMode) {
        setFormData({ name: '', parent_id: null, sort_key: 0, url: '', icon: '', is_active: true });
      }
    } catch (err) {
      onError?.(err as Error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="menu-form">
      <div className="form-group">
        <label htmlFor="name">{isEditMode ? 'Name' : 'Name *'}</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name ?? ''}
          onChange={handleChange}
          className={errors.name ? 'error' : ''}
          placeholder="Enter menu item name"
          required={!isEditMode}
        />
        {errors.name && <span className="error-message">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="parent_id">Parent Menu (Optional)</label>
        <select
          id="parent_id"
          name="parent_id"
          value={formData.parent_id ?? ''}
          onChange={(e) => handleChange(e as unknown as ChangeEvent<HTMLSelectElement>)}
        >
          <option value="">-- No Parent (Root Level) --</option>
          {parentOptions
            .filter((opt) => !isEditMode || opt.id !== itemId)
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
        {isEditMode && parentOptions.some(opt => opt.id === itemId) && (
          <span className="form-hint">Cannot set self as parent</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="sort_key">Sort Order</label>
        <input
          type="number"
          id="sort_key"
          name="sort_key"
          value={formData.sort_key ?? 0}
          onChange={handleChange}
          min="0"
          placeholder="0"
        />
      </div>

      <div className="form-group">
        <label htmlFor="url">URL (Optional)</label>
        <input
          type="text"
          id="url"
          name="url"
          value={formData.url ?? ''}
          onChange={handleChange}
          className={errors.url ? 'error' : ''}
          placeholder="/path or https://example.com"
        />
        {errors.url && <span className="error-message">{errors.url}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="icon">Icon (Optional)</label>
        <input
          type="text"
          id="icon"
          name="icon"
          value={formData.icon ?? ''}
          onChange={handleChange}
          placeholder="e.g., home, users, settings"
        />
      </div>

      <div className="form-group checkbox-group">
        <label>
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active ?? true}
            onChange={handleChange}
          />
          Active
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          {isSubmitting ? (isEditMode ? 'Updating...' : 'Creating...') : submitLabel}
        </button>
      </div>
    </form>
  );
}