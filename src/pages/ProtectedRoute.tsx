import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdminCheck } from '../hooks/useAdminCheck';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** When true, also requires the user to have profiles.role = 'admin' */
  adminOnly?: boolean;
}

export default function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminCheck();

  // Wait for both auth and (when needed) admin-role checks
  if (authLoading || (adminOnly && adminLoading)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-green-400 font-mono flex items-center justify-center">
        <p className="animate-pulse">Verifying access...</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}