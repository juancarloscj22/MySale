import { useEffect, useState } from 'react';
import { getAdminUsers } from '../../services/users';

const pageSize = 25;
const roles = {
  customer: 'Cliente',
  admin: 'Administrador',
  developer: 'Desarrollador',
};

const formatDate = (value) =>
  new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value));

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    getAdminUsers({ page, pageSize })
      .then((result) => {
        if (!active) return;
        setUsers(result.users);
        setTotal(result.total);
        setError('');
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, reloadKey]);

  const handleRefresh = () => {
    setLoading(true);
    setError('');
    setReloadKey((current) => current + 1);
  };

  const changePage = (nextPage) => {
    setLoading(true);
    setError('');
    setPage(nextPage);
  };

  const pageCount = Math.ceil(total / pageSize);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Administración</p>
          <h1 className="mt-2 text-4xl font-black text-slate-900">Gestión de usuarios</h1>
          <p className="mt-2 text-slate-600">Cuentas registradas: {total}</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Actualizar
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
          No se pudieron cargar los usuarios: {error}
        </p>
      )}
      {loading && <p className="py-10 text-slate-600">Cargando usuarios...</p>}
      {!loading && !error && users.length === 0 && (
        <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          No hay usuarios registrados.
        </p>
      )}

      {!loading && !error && users.length > 0 && (
        <>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th scope="col" className="p-4">Usuario</th>
                  <th scope="col" className="p-4">Contacto</th>
                  <th scope="col" className="p-4">Rol</th>
                  <th scope="col" className="p-4">Estado</th>
                  <th scope="col" className="p-4">Registro</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-200">
                    <td className="p-4">
                      <p className="font-semibold text-slate-900">{user.full_name || 'Sin nombre'}</p>
                      <p className="mt-1 break-all text-xs text-slate-500">{user.email || 'Sin correo'}</p>
                    </td>
                    <td className="p-4 text-slate-600">{user.phone || 'Sin teléfono'}</td>
                    <td className="p-4 text-slate-700">{roles[user.role] ?? user.role}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        user.blocked
                          ? 'bg-red-100 text-red-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {user.blocked ? 'Bloqueado' : 'Activo'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap p-4 text-slate-600">{formatDate(user.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Página {page + 1} de {pageCount}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => changePage(Math.max(0, page - 1))}
                disabled={loading || page === 0}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() => changePage(Math.min(pageCount - 1, page + 1))}
                disabled={loading || page + 1 >= pageCount}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
