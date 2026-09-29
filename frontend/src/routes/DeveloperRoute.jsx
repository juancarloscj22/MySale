import { Navigate } from 'react-router-dom';

export default function DeveloperRoute({ children, isDeveloper = false }) {
  if (!isDeveloper) {
    return <Navigate to="/" replace />;
  }

  return children;
}
