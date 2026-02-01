import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import type { User, Department } from '@/features/admin/services/admin.service';

const createUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email address')
    .refine((email) => email.endsWith('@tekcellent.com'), {
      message: 'Email must be a @tekcellent.com address',
    }),
  role: z.enum(['EMPLOYEE', 'APPROVER', 'FINANCE', 'ADMIN']),
  departmentId: z.string().optional(),
});

const editUserSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z.string().optional(),
  role: z.enum(['EMPLOYEE', 'APPROVER', 'FINANCE', 'ADMIN']),
  departmentId: z.string().optional(),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;
type EditUserFormData = z.infer<typeof editUserSchema>;

export interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserFormData | EditUserFormData) => Promise<void>;
  initialValue?: User | null;
  departments: Department[];
  isLoading?: boolean;
  mode: 'create' | 'edit';
  error?: string | null;
}

const roleOptions = [
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'APPROVER', label: 'Approver' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'ADMIN', label: 'Admin' },
];

export const UserForm: React.FC<UserFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialValue,
  departments,
  isLoading = false,
  mode,
  error,
}) => {
  const isEditMode = mode === 'edit';
  const schema = isEditMode ? editUserSchema : createUserSchema;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormData | EditUserFormData>({
    resolver: zodResolver(schema),
    defaultValues: isEditMode
      ? {
          firstName: '',
          lastName: '',
          phone: '',
          role: 'EMPLOYEE',
          departmentId: '',
        }
      : {
          firstName: '',
          lastName: '',
          email: '',
          role: 'EMPLOYEE',
          departmentId: '',
        },
  });

  useEffect(() => {
    if (initialValue && isEditMode) {
      reset({
        firstName: initialValue.firstName,
        lastName: initialValue.lastName,
        phone: '',
        role: initialValue.role as 'EMPLOYEE' | 'APPROVER' | 'FINANCE' | 'ADMIN',
        departmentId: initialValue.departmentId || '',
      });
    } else if (!isEditMode) {
      reset({
        firstName: '',
        lastName: '',
        email: '',
        role: 'EMPLOYEE',
        departmentId: '',
      });
    }
  }, [initialValue, isEditMode, reset]);

  const handleFormSubmit = async (data: CreateUserFormData | EditUserFormData) => {
    const cleanedData = {
      ...data,
      departmentId: data.departmentId || undefined,
    };
    if ('phone' in cleanedData) {
      cleanedData.phone = cleanedData.phone || undefined;
    }
    await onSubmit(cleanedData);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const departmentOptions = [
    { value: '', label: 'No department' },
    ...departments.map((dept) => ({
      value: dept.id,
      label: dept.name,
    })),
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? 'Edit User' : 'Add New User'}
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
            {isEditMode && initialValue && (
              <Input
                label="Email"
                value={initialValue.email}
                disabled
                helperText="Email cannot be changed"
              />
            )}

            {!isEditMode && (
              <Input
                label="Email"
                type="email"
                {...register('email' as keyof CreateUserFormData)}
                error={(errors as Record<string, { message?: string }>).email?.message}
                placeholder="user@tekcellent.com"
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                {...register('firstName')}
                error={errors.firstName?.message}
              />
              <Input
                label="Last Name"
                {...register('lastName')}
                error={errors.lastName?.message}
              />
            </div>

            {isEditMode && (
              <Input
                label="Phone"
                type="tel"
                {...register('phone' as keyof EditUserFormData)}
                error={(errors as Record<string, { message?: string }>).phone?.message}
                placeholder="Optional"
              />
            )}

            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select
                  label="Role"
                  options={roleOptions}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.role?.message}
                />
              )}
            />

            <Controller
              name="departmentId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Department"
                  options={departmentOptions}
                  value={field.value || ''}
                  onChange={field.onChange}
                  placeholder="Select department"
                />
              )}
            />

            {!isEditMode && (
              <p className="text-xs text-gray-500">
                A temporary password will be generated and the user will be prompted to change it on
                first login.
              </p>
            )}
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
            {isEditMode ? 'Save Changes' : 'Create User'}
          </button>
        </ModalFooter>
      </form>
    </Modal>
  );
};

UserForm.displayName = 'UserForm';
