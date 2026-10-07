import { useState } from 'react';
import { useAuth } from '../../context/useAuth';

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500';

export default function MyAccount() {
  const { profile, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (fullName.trim().length < 1 || fullName.trim().length > 120) {
      setError('El nombre debe tener entre 1 y 120 caracteres.');
      return;
    }

    if (phone.trim().length < 7 || phone.trim().length > 32) {
      setError('El teléfono debe tener entre 7 y 32 caracteres.');
      return;
    }

    setSaving(true);

    try {
      await updateProfile({ fullName, phone });
      setNotice('Tus datos de cuenta se actualizaron.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Tu cuenta</p>
      <h1 className="mt-2 text-4xl font-black text-slate-900">Mis datos</h1>
      <p className="mt-3 text-slate-600">
        El nombre y teléfono se usarán automáticamente en tus pedidos.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Nombre completo *</span>
          <input
            type="text"
            autoComplete="name"
            required
            minLength={1}
            maxLength={120}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Teléfono *</span>
          <input
            type="tel"
            autoComplete="tel"
            required
            minLength={7}
            maxLength={32}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={inputClass}
          />
        </label>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar datos'}
        </button>
      </form>
    </div>
  );
}
