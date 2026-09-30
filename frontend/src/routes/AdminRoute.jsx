import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function AdminRoute({ children }) {
  const { profile } = useAuth();

  if (profile?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}
