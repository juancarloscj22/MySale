import { useState } from 'react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [age, setAge] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    if (Number(age) < 18) {
      alert('Debes ser mayor de 18 años para continuar.');
      return;
    }
    alert(isLogin ? 'Inicio de sesión exitoso' : 'Registro exitoso');
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
            <button type="button" onClick={() => setIsLogin(true)} className={`flex-1 rounded-full px-4 py-2 text-sm font-bold ${isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              Iniciar sesión
            </button>
            <button type="button" onClick={() => setIsLogin(false)} className={`flex-1 rounded-full px-4 py-2 text-sm font-bold ${!isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
              Registrarse
            </button>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Correo electrónico</span>
            <input type="email" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500" placeholder="usuario@email.com" />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Contraseña</span>
            <input type="password" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500" placeholder="••••••••" />
          </label>

          {!isLogin && (
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Edad</span>
              <input type="number" min="18" value={age} onChange={(e) => setAge(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500" placeholder="18" />
            </label>
          )}

          <button type="submit" className="w-full rounded-full bg-emerald-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-600">
            {isLogin ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </div>
    </div>
  );
}
