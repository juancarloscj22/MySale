import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

export default function Auth() {
  const { user, loading, signIn, signUp } = useAuth();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to={location.state?.from ?? '/'} replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');

    if (!isLogin && Number(age) < 18) {
      setError('Debes confirmar que tienes al menos 18 años para registrarte.');
      return;
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        const { session: newSession } = await signUp({ email, password, fullName, phone });
        if (!newSession) {
          setNotice('Revisa tu correo para confirmar la cuenta y completar el registro.');
        }
      }
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const changeMode = (loginMode) => {
    setIsLogin(loginMode);
    setError('');
    setNotice('');
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:grid-cols-2">
        <div className="rounded-[1.5rem] bg-slate-900 p-8 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">MySale</p>
          <h1 className="mt-4 text-4xl font-black">Tu cuenta de compra</h1>
          <p className="mt-4 text-slate-300">
            Accede a tu historial, carrito y gestión de pedidos en cualquier momento.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => changeMode(true)}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-bold ${isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => changeMode(false)}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-bold ${!isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Registrarse
            </button>
          </div>

          {!isLogin && (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Nombre completo</span>
              <input
                type="text"
                autoComplete="name"
                required
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
              />
            </label>
          )}

          {!isLogin && (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Teléfono</span>
              <input
                type="tel"
                autoComplete="tel"
                required
                minLength={7}
                maxLength={32}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                placeholder="Tu número de contacto"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Correo electrónico</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
              placeholder="usuario@email.com"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Contraseña</span>
            <input
              type="password"
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
              placeholder="Mínimo 6 caracteres"
            />
          </label>

          {!isLogin && (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Edad</span>
              <input
                type="number"
                min="18"
                max="120"
                required
                value={age}
                onChange={(event) => setAge(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500"
                placeholder="18"
              />
            </label>
          )}

          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

          <button
            type="submit"
            disabled={submitting || loading}
            className="w-full rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-slate-900 transition hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? 'Procesando...' : isLogin ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}
