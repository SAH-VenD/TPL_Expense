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
import type { Department, User } from '@/features/admin/services/admin.service';

const departmentFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(10, 'Code must be 10 characters or less')
    .regex(/^[A-Z0-9_]+$/, 'Code must be uppercase alphanumeric'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  parentId: z.string().optional(),
  departmentHeadId: z.string().optional(),
  isActive: z.boolean().default(true),
});

type DepartmentFormData = z.infer<typeof departmentFormSchema>;

interface DepartmentTreeNode extends Department {
  children?: DepartmentTreeNode[];
}

export interface DepartmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DepartmentFormData) => Promise<void>;
  initialValue?: DepartmentTreeNode | null;
  departments: DepartmentTreeNode[];
  users: User[];
  isLoading?: boolean;
  mode?: 'create' | 'edit';
  error?: string | null;
}

// Flatten departments for select dropdown
function flattenDepartments(
  departments: DepartmentTreeNode[],
  level = 0,
): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = [];
  for (const dept of departments) {
    result.push({
      value: dept.id,
      label: `${'  '.repeat(level)}${level > 0 ? '└ ' : ''}${dept.name} (${dept.code})`,
    });
    if (dept.children && dept.children.length > 0) {
      result.push(...flattenDepartments(dept.children, level + 1));
    }
  }
  return result;
}

export const DepartmentForm: React.FC<DepartmentFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialValue,
  departments,
  users,
  isLoading = false,
  mode = 'create',
  error,
}) => {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      parentId: '',
      departmentHeadId: '',
      isActive: true,
    },
  });

  const codeValue = watch('code');

  useEffect(() => {
    if (initialValue && mode === 'edit') {
      reset({
        name: initialValue.name,
        code: initialValue.code,
        description: initialValue.description || '',
        parentId: '',
        departmentHeadId: '',
        isActive: initialValue.isActive,
      });
    } else {
      reset({
        name: '',
        code: '',
        description: '',
        parentId: '',
        departmentHeadId: '',
        isActive: true,
      });
    }
  }, [initialValue, mode, reset]);

  const handleFormSubmit = async (data: DepartmentFormData) => {
    await onSubmit({
      ...data,
      code: data.code.toUpperCase(),
      parentId: data.parentId || undefined,
      departmentHeadId: data.departmentHeadId || undefined,
    });
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  // Filter out the current department and its descendants from parent options
  const getAvailableParents = () => {
    if (!initialValue) return flattenDepartments(departments);

    const descendantIds = new Set<string>();
    const collectDescendants = (dept: DepartmentTreeNode) => {
      descendantIds.add(dept.id);
      dept.children?.forEach(collectDescendants);
    };
    collectDescendants(initialValue);

    const filterDepartments = (depts: DepartmentTreeNode[]): DepartmentTreeNode[] => {
      return depts
        .filter((dept) => !descendantIds.has(dept.id))
        .map((dept) => ({
          ...dept,
          children: dept.children ? filterDepartments(dept.children) : [],
        }));
    };

    return flattenDepartments(filterDepartments(departments));
  };

  const parentOptions = [{ value: '', label: 'None (Top Level)' }, ...getAvailableParents()];

  const userOptions = [
    { value: '', label: 'No department head' },
    ...users
      .filter((user) => user.status === 'ACTIVE')
      .map((user) => ({
        value: user.id,
        label: `${user.firstName} ${user.lastName} (${user.email})`,
      })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'edit' ? 'Edit Department' : 'Create Department'}
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
              placeholder="e.g., Information Technology"
            />

            <Input
              label="Code"
              {...register('code', {
                onChange: (e) => {
                  e.target.value = e.target.value.toUpperCase();
                },
              })}
              value={codeValue?.toUpperCase() || ''}
              error={errors.code?.message}
              placeholder="e.g., IT"
              helperText="Unique identifier (uppercase, alphanumeric)"
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
                  label="Parent Department"
                  options={parentOptions}
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Select parent department"
                  disabled={mode === 'edit' && !!initialValue?.children?.length}
                  helperText={
                    mode === 'edit' && initialValue?.children?.length
                      ? 'Cannot change parent of department with children'
                      : undefined
                  }
                />
              )}
            />

            <Controller
              name="departmentHeadId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Department Head"
                  options={userOptions}
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Select department head"
                />
              )}
            />

            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Checkbox label="Active" checked={field.value} onChange={field.onChange} />
              )}
            />
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
            {mode === 'edit' ? 'Save Changes' : 'Create Department'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

DepartmentForm.displayName = 'DepartmentForm';
