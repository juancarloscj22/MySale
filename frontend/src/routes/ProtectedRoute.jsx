import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function ProtectedRoute({ children }) {
  const { user, loading, profile, profileError, refreshProfile } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="p-10 text-center text-slate-600">Cargando sesión...</p>;
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  if (profileError) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p role="alert" className="text-red-700">No se pudo cargar tu perfil: {profileError}</p>
        <button
          type="button"
          onClick={refreshProfile}
          className="mt-4 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (profile?.blocked) {
    return <p className="p-10 text-center text-red-700">Tu cuenta está bloqueada. Contacta con la tienda.</p>;
  }

  if (!profile) {
    return <p role="alert" className="p-10 text-center text-red-700">No se encontró el perfil de esta cuenta.</p>;
  }

  return children;
}
