import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

const appRoles = ['admin', 'manager', 'cashier'] as const;

type AppRole = (typeof appRoles)[number];

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

const defaultPathByRole: Record<AppRole, string> = {
  admin: '/dashboard',
  manager: '/dashboard',
  cashier: '/pos',
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading, role, signOut } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!loading && user && role !== null && !appRoles.includes(role as AppRole)) {
      toast.error('Access denied');
      void signOut();
    }
  }, [loading, user, role, signOut]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (role === null) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role as AppRole)) {
    toast.error('Access denied');
    return <Navigate to={defaultPathByRole[role as AppRole]} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
