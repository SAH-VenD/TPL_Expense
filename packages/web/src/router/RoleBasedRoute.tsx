import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import type { RoleType } from '@/features/auth/types/auth.types';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: RoleType[];
}

export function RoleBasedRoute({ children, allowedRoles }: RoleBasedRouteProps) {
  const { user } = useAppSelector((state) => state.auth);

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
