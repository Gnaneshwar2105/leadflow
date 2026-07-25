import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// requiredRole is optional - omit it for "any authenticated user"
export default function PrivateRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/dashboard" replace />;

  return children;
}
