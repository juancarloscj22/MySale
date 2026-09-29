import { Navigate } from 'react-router-dom';

export default function AdminRoute({ children, isAdmin = false }) {
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
