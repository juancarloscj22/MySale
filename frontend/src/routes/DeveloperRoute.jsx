import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function DeveloperRoute({ children }) {
  const { profile } = useAuth();

  if (profile?.role !== 'developer') {
    return <Navigate to="/" replace />;
  }

  return children;
}
