# React Feature Template Skill

Use this template when creating new React features for TPL Expense frontend.

## Standard Feature Structure

```
src/features/{feature-name}/
├── components/
│   ├── {Feature}List/
│   │   ├── {Feature}List.tsx
│   │   └── index.ts
│   ├── {Feature}Form/
│   │   ├── {Feature}Form.tsx
│   │   └── index.ts
│   └── {Feature}Detail/
│       ├── {Feature}Detail.tsx
│       └── index.ts
├── hooks/
│   └── use{Feature}.ts
├── services/
│   └── {feature}.service.ts
├── types/
│   └── {feature}.types.ts
└── index.ts
```

## RTK Query Service Template

```typescript
// services/{feature}.service.ts
import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '@/services/api';
import type { {Feature}, Create{Feature}Dto, Update{Feature}Dto, {Feature}Filters } from '../types/{feature}.types';
import type { PaginatedResponse } from '@/types/api.types';

export const {feature}Api = createApi({
  reducerPath: '{feature}Api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['{Feature}'],
  endpoints: (builder) => ({
    get{Features}: builder.query<PaginatedResponse<{Feature}>, {Feature}Filters>({
      query: (filters) => ({
        url: '/{features}',
        params: filters,
      }),
      providesTags: ['{Feature}'],
    }),

    get{Feature}: builder.query<{Feature}, string>({
      query: (id) => `/{features}/${id}`,
      providesTags: (_result, _error, id) => [{ type: '{Feature}', id }],
    }),

    create{Feature}: builder.mutation<{Feature}, Create{Feature}Dto>({
      query: (body) => ({
        url: '/{features}',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['{Feature}'],
    }),

    update{Feature}: builder.mutation<{Feature}, { id: string; data: Update{Feature}Dto }>({
      query: ({ id, data }) => ({
        url: `/{features}/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: '{Feature}', id }],
    }),

    delete{Feature}: builder.mutation<void, string>({
      query: (id) => ({
        url: `/{features}/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['{Feature}'],
    }),
  }),
});

export const {
  useGet{Features}Query,
  useGet{Feature}Query,
  useCreate{Feature}Mutation,
  useUpdate{Feature}Mutation,
  useDelete{Feature}Mutation,
} = {feature}Api;
```

## Custom Hook Template

```typescript
// hooks/use{Feature}.ts
import { useState } from 'react';
import {
  useGet{Features}Query,
  useCreate{Feature}Mutation,
  useUpdate{Feature}Mutation,
  useDelete{Feature}Mutation,
} from '../services/{feature}.service';
import type { {Feature}Filters } from '../types/{feature}.types';

export function use{Feature}(initialFilters?: {Feature}Filters) {
  const [filters, setFilters] = useState<{Feature}Filters>(initialFilters ?? {});

  const { data, isLoading, error, refetch } = useGet{Features}Query(filters);
  const [create{Feature}, { isLoading: isCreating }] = useCreate{Feature}Mutation();
  const [update{Feature}, { isLoading: isUpdating }] = useUpdate{Feature}Mutation();
  const [delete{Feature}, { isLoading: isDeleting }] = useDelete{Feature}Mutation();

  return {
    {features}: data?.data ?? [],
    pagination: data?.meta?.pagination,
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,
    filters,
    setFilters,
    refetch,
    create{Feature},
    update{Feature},
    delete{Feature},
  };
}
```

## List Component Template

```tsx
// components/{Feature}List/{Feature}List.tsx
import { useState } from 'react';
import { use{Feature} } from '../../hooks/use{Feature}';
import { Table } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export function {Feature}List() {
  const { {features}, isLoading, pagination, setFilters } = use{Feature}();

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">{Features}</h1>
        <Button variant="primary">Add {Feature}</Button>
      </div>

      <Table
        data={{features}}
        columns={[
          { header: 'Name', accessor: 'name' },
          { header: 'Status', accessor: 'status' },
          { header: 'Created', accessor: 'createdAt' },
        ]}
        pagination={pagination}
        onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
      />
    </div>
  );
}
```

## Form Component Template

```tsx
// components/{Feature}Form/{Feature}Form.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormField } from '@/components/form/FormField';

const {feature}Schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

type {Feature}FormData = z.infer<typeof {feature}Schema>;

interface {Feature}FormProps {
  initialData?: Partial<{Feature}FormData>;
  onSubmit: (data: {Feature}FormData) => Promise<void>;
  isLoading?: boolean;
}

export function {Feature}Form({ initialData, onSubmit, isLoading }: {Feature}FormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{Feature}FormData>({
    resolver: zodResolver({feature}Schema),
    defaultValues: initialData,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Name" error={errors.name?.message}>
        <Input {...register('name')} placeholder="Enter name" />
      </FormField>

      <FormField label="Description" error={errors.description?.message}>
        <Input {...register('description')} placeholder="Enter description" />
      </FormField>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary">
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          Save
        </Button>
      </div>
    </form>
  );
}
```

## Types Template

```typescript
// types/{feature}.types.ts
export interface {Feature} {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Create{Feature}Dto {
  name: string;
  description?: string;
}

export interface Update{Feature}Dto extends Partial<Create{Feature}Dto> {}

export interface {Feature}Filters {
  page?: number;
  pageSize?: number;
  search?: string;
  isActive?: boolean;
}
```

## Page Component Template

```tsx
// pages/{features}/{Feature}ListPage.tsx
import { {Feature}List } from '@/features/{features}/components/{Feature}List';

export function {Feature}ListPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <{Feature}List />
    </div>
  );
}
```
