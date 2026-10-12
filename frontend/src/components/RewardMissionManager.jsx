import { useEffect, useState } from 'react';
import { useAuth } from '../context/useAuth';
import MayCoinAmount from './MayCoinAmount';
import {
  createRewardMission,
  createMissionTemplate,
  deleteRewardMission,
  getUserPoints,
  getRewardMissions,
  getRewardMissionTargetLabel,
  loadUserRewards,
  updateRewardMission,
} from '../services/rewards';

const defaultForm = {
  title: '',
  description: '',
  type: 'daily_login',
  targetValue: 1,
  rewardPoints: 50,
  active: true,
};

export default function RewardMissionManager() {
  const { profile } = useAuth();
  const [missions, setMissions] = useState([]);
  const [form, setForm] = useState(defaultForm);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [points, setPoints] = useState(() => getUserPoints(profile?.id));
  const [loading, setLoading] = useState(true);

  const isAdminOrDeveloper = profile?.role === 'admin' || profile?.role === 'developer';

  useEffect(() => {
    let active = true;
    Promise.all([getRewardMissions(), loadUserRewards(profile?.id)])
      .then(([loadedMissions, rewards]) => {
        if (!active) return;
        setMissions(loadedMissions);
        setPoints(rewards.points);
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
  }, [profile?.id]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSaveMission = async (event) => {
    event.preventDefault();
    setNotice('');
    setError('');
    const title = form.title.trim();
    const description = form.description.trim();
    if (!title) {
      setNotice('Escribe un título para la misión.');
      return;
    }

    const targetValue = Number(form.targetValue);
    const rewardPoints = Number(form.rewardPoints);
    if (
      !Number.isFinite(targetValue)
      || targetValue <= 0
      || (form.type === 'purchase_quantity' && !Number.isInteger(targetValue))
    ) {
      setNotice(form.type === 'purchase_quantity'
        ? 'La cantidad de productos debe ser un número entero mayor que cero.'
        : 'El objetivo debe ser mayor que cero.');
      return;
    }
    if (!Number.isSafeInteger(rewardPoints) || rewardPoints <= 0) {
      setNotice('La recompensa debe ser un número entero de MayCoins mayor que cero.');
      return;
    }

    try {
      const nextMission = await createRewardMission(createMissionTemplate({
        title,
        description: description || 'Misión de recompensas.',
        type: form.type,
        targetValue,
        rewardPoints,
        active: form.active,
      }), profile.id);
      setMissions((current) => [...current, nextMission]);
      setForm(defaultForm);
      setNotice(`La misión “${nextMission.title}” quedó creada.`);
    } catch (saveError) {
      setError(saveError.message);
    }
  };

  const handleDeleteMission = async (missionId) => {
    setError('');
    try {
      await deleteRewardMission(missionId);
      setMissions((current) => current.filter((mission) => mission.id !== missionId));
      setNotice('La misión fue eliminada.');
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const handleToggleMission = async (mission) => {
    setError('');
    try {
      const updatedMission = await updateRewardMission(mission.id, { active: !mission.active });
      setMissions((current) => current.map((item) => (
        item.id === mission.id ? updatedMission : item
      )));
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Administración</p>
          <h1 className="mt-2 text-4xl font-black text-slate-900">Misión de recompensas</h1>
        </div>
        <div className="rounded-full bg-slate-900 px-5 py-3 text-2xl font-black text-amber-300">
          <MayCoinAmount amount={points} iconClassName="h-7 w-7" />
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          No se pudo completar la operación: {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
          {notice}
        </p>
      )}

      {isAdminOrDeveloper && (
        <form onSubmit={handleSaveMission} className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black text-slate-900">Crear misión</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Título</span>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-700 outline-none focus:border-amber-500"
                placeholder="Misión de compra semanales"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Descripción</span>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows="3"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-700 outline-none focus:border-amber-500"
                placeholder="Explica la misión para que tus clientes la entiendan."
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Tipo</span>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-700 outline-none focus:border-amber-500"
              >
                <option value="daily_login">Inicio de sesión diario</option>
                <option value="purchase_total">Compra por total gastado</option>
                <option value="purchase_quantity">Cantidad comprada</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">MayCoins en recompensa</span>
              <input
                name="rewardPoints"
                type="number"
                min="1"
                value={form.rewardPoints}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-700 outline-none focus:border-amber-500"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                {form.type === 'purchase_quantity' ? 'Cantidad de productos' : 'Objetivo'}
              </span>
              <input
                name="targetValue"
                type="number"
                min="1"
                step={form.type === 'purchase_quantity' ? '1' : 'any'}
                value={form.targetValue}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-700 outline-none focus:border-amber-500"
              />
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
              <input
                name="active"
                type="checkbox"
                checked={form.active}
                onChange={handleChange}
              />
              Activa la misión
            </label>
          </div>
          <div className="mt-5">
            <button
              type="submit"
              className="rounded-full border-2 border-emerald-700 bg-emerald-100 px-6 py-3 text-sm font-bold text-emerald-800 shadow-[inset_3px_3px_5px_rgba(255,255,255,0.85),inset_-3px_-3px_5px_rgba(15,23,42,0.22)] transition hover:bg-emerald-200"
            >
              Guardar misión
            </button>
          </div>
        </form>
      )}

      {loading && <p role="status" className="text-slate-600">Cargando misiones...</p>}
      {!loading && missions.length === 0 && (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">No hay misiones configuradas.</p>
      )}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {missions.map((mission) => {
          return (
            <article key={mission.id} className={`rounded-3xl border p-5 shadow-sm ${mission.active ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {mission.type === 'daily_login' ? 'Diario' : 'Compra'}
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-slate-900">{mission.title}</h3>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  <MayCoinAmount amount={mission.rewardPoints} iconClassName="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{mission.description}</p>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                <span>{getRewardMissionTargetLabel(mission)}</span>
                <span className={`font-bold ${mission.active ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {mission.active ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              {isAdminOrDeveloper && (
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleToggleMission(mission)}
                    className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {mission.active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteMission(mission.id)}
                    className="rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
