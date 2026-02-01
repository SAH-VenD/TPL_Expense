import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import type { Category } from '@/features/admin/services/admin.service';

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  code: z.string().min(1, 'Code is required').max(20, 'Code must be 20 characters or less'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  parentId: z.string().optional(),
  requiresReceipt: z.boolean().default(true),
  requiresPreApproval: z.boolean().default(false),
  maxAmount: z.number().min(0, 'Max amount must be positive').optional().nullable(),
  isActive: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

export interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CategoryFormData) => Promise<void>;
  initialValue?: Category | null;
  categories: Category[];
  isLoading?: boolean;
  mode?: 'create' | 'edit';
  error?: string | null;
}

// Flatten categories for select dropdown
function flattenCategories(categories: Category[], level = 0): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = [];
  for (const cat of categories) {
    result.push({
      value: cat.id,
      label: `${'  '.repeat(level)}${level > 0 ? '└ ' : ''}${cat.name}`,
    });
    if (cat.children && cat.children.length > 0) {
      result.push(...flattenCategories(cat.children, level + 1));
    }
  }
  return result;
}

export const CategoryForm: React.FC<CategoryFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialValue,
  categories,
  isLoading = false,
  mode = 'create',
  error,
}) => {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      parentId: '',
      requiresReceipt: true,
      requiresPreApproval: false,
      maxAmount: null,
      isActive: true,
    },
  });

  useEffect(() => {
    if (initialValue && mode === 'edit') {
      reset({
        name: initialValue.name,
        code: initialValue.code,
        description: initialValue.description || '',
        parentId: initialValue.parentId || '',
        requiresReceipt: initialValue.requiresReceipt,
        requiresPreApproval: initialValue.requiresPreApproval,
        maxAmount: initialValue.maxAmount || null,
        isActive: initialValue.isActive,
      });
    } else {
      reset({
        name: '',
        code: '',
        description: '',
        parentId: '',
        requiresReceipt: true,
        requiresPreApproval: false,
        maxAmount: null,
        isActive: true,
      });
    }
  }, [initialValue, mode, reset]);

  const handleFormSubmit = async (data: CategoryFormData) => {
    await onSubmit({
      ...data,
      parentId: data.parentId || undefined,
      maxAmount: data.maxAmount || undefined,
    });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Filter out the current category and its descendants from parent options
  const getAvailableParents = () => {
    if (!initialValue) return flattenCategories(categories);

    const descendantIds = new Set<string>();
    const collectDescendants = (cat: Category) => {
      descendantIds.add(cat.id);
      cat.children?.forEach(collectDescendants);
    };
    collectDescendants(initialValue);

    const filterCategories = (cats: Category[]): Category[] => {
      return cats
        .filter((cat) => !descendantIds.has(cat.id))
        .map((cat) => ({
          ...cat,
          children: cat.children ? filterCategories(cat.children) : [],
        }));
    };

    return flattenCategories(filterCategories(categories));
  };

  const parentOptions = [
    { value: '', label: 'None (Top Level)' },
    ...getAvailableParents(),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'edit' ? 'Edit Category' : 'Create Category'}
      size="md"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <ModalBody>
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}
          <div className="space-y-4">
            <Input
              label="Name"
              {...register('name')}
              error={errors.name?.message}
              placeholder="e.g., Travel"
            />

            <Input
              label="Code"
              {...register('code')}
              error={errors.code?.message}
              placeholder="e.g., TRAVEL"
              helperText="Unique identifier for this category"
            />

            <div>
              <label className="label">Description</label>
              <textarea
                {...register('description')}
                rows={3}
                className="input"
                placeholder="Optional description..."
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>

            <Controller
              name="parentId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Parent Category"
                  options={parentOptions}
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Select parent category"
                  disabled={mode === 'edit' && !!initialValue?.children?.length}
                  helperText={
                    mode === 'edit' && initialValue?.children?.length
                      ? 'Cannot change parent of category with children'
                      : undefined
                  }
                />
              )}
            />

            <Controller
              name="maxAmount"
              control={control}
              render={({ field }) => (
                <Input
                  label="Max Amount (PKR)"
                  type="number"
                  value={field.value ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val ? Number(val) : null);
                  }}
                  error={errors.maxAmount?.message}
                  placeholder="Leave blank for no limit"
                  helperText="Maximum expense amount for this category"
                />
              )}
            />

            <div className="space-y-3">
              <Controller
                name="requiresReceipt"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    label="Requires receipt"
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />

              <Controller
                name="requiresPreApproval"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    label="Requires pre-approval"
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />

              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    label="Active"
                    checked={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting || isLoading}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 inline-flex items-center"
          >
            {(isSubmitting || isLoading) && <Spinner size="sm" className="mr-2" />}
            {mode === 'edit' ? 'Save Changes' : 'Create Category'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

CategoryForm.displayName = 'CategoryForm';
