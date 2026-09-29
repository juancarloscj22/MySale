import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, isAuthenticated = true }) {
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}
