import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/useAuth';
import MayCoinAmount from '../../components/MayCoinAmount';
import {
  createMessage,
  getMessageRecipients,
  getSentMessages,
} from '../../services/messages';

const emptyForm = {
  title: '',
  body: '',
  audience: 'all',
  recipientUserId: '',
  awardPoints: false,
  pointsAmount: '',
};
const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500';

const formatDate = (value) =>
  new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default function Messages() {
  const { profile } = useAuth();
  const [recipients, setRecipients] = useState([]);
  const [sentMessages, setSentMessages] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [recipientList, sentList] = await Promise.all([
        getMessageRecipients(),
        getSentMessages(profile.id),
      ]);
      setRecipients(recipientList);
      setSentMessages(sentList);
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [profile.id]);

  useEffect(() => {
    let active = true;
    Promise.all([getMessageRecipients(), getSentMessages(profile.id)])
      .then(([recipientList, sentList]) => {
        if (!active) return;
        setRecipients(recipientList);
        setSentMessages(sentList);
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
  }, [profile.id]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);

    try {
      await createMessage({
        userId: profile.id,
        recipientUserId: form.audience === 'user' ? form.recipientUserId : null,
        title: form.title,
        body: form.body,
        pointsAmount: form.awardPoints && canAwardPoints ? Number(form.pointsAmount) : 0,
      });
      setForm(emptyForm);
      setNotice(
        form.awardPoints && canAwardPoints
          ? (
            <span className="inline-flex flex-wrap items-center gap-1">
              Mensaje enviado con <MayCoinAmount amount={Number(form.pointsAmount)} iconClassName="h-4 w-4" />
              para {form.audience === 'all' ? 'cada cliente' : 'el destinatario'}.
            </span>
          )
          : 'Mensaje enviado.',
      );
      await loadData();
    } catch (sendError) {
      setError(sendError.message);
    } finally {
      setSaving(false);
    }
  };

  const recipientLabels = new Map(
    recipients.map((recipient) => [
      recipient.id,
      `${recipient.full_name?.trim() || recipient.email || 'Usuario'}${recipient.role === 'developer' ? ' · Dev' : recipient.role === 'admin' ? ' · Admin' : ''}`,
    ]),
  );
  const selectedRecipient = recipients.find((recipient) => recipient.id === form.recipientUserId);
  const canAwardPoints = form.audience === 'all' || ['customer', 'admin', 'developer'].includes(selectedRecipient?.role);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Comunicación</p>
      <h1 className="mt-2 text-4xl font-black text-slate-900">Mensajes</h1>
      <p className="mt-3 text-slate-600">
        Envía avisos a todos los usuarios o mensajes privados a clientes, administradores y desarrolladores. También puedes incluir MayCoins en mensajes privados.
      </p>

      {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
      {notice && <p role="status" className="mt-6 rounded-xl bg-emerald-100 p-4 text-emerald-800">{notice}</p>}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Destinatarios *</span>
          <select
            value={form.audience}
            onChange={(event) => setForm((current) => ({
              ...current,
              audience: event.target.value,
              recipientUserId: '',
            }))}
            className={inputClass}
          >
            <option value="all">Todos los usuarios</option>
            <option value="user">Un usuario</option>
          </select>
        </label>

        {form.audience === 'user' && (
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">Usuario *</span>
            <select
              required
              value={form.recipientUserId}
              onChange={(event) => {
                const recipient = recipients.find((item) => item.id === event.target.value);
                setForm((current) => ({
                  ...current,
                  recipientUserId: event.target.value,
                  awardPoints: !['customer', 'admin', 'developer'].includes(recipient?.role)
                    ? false
                    : current.awardPoints,
                }));
              }}
              className={inputClass}
            >
              <option value="">Selecciona un usuario</option>
              {recipients.map((recipient) => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.full_name?.trim() || recipient.email || recipient.id}
                  {recipient.email && recipient.full_name?.trim() ? ` · ${recipient.email}` : ''}
                  {recipient.role === 'developer' ? ' · Dev' : ''}
                  {recipient.role === 'admin' ? ' · Admin' : ''}
                </option>
              ))}
            </select>
            {recipients.length === 0 && !loading && (
              <span className="mt-1 block text-sm text-slate-500">No hay destinatarios activos disponibles.</span>
            )}
          </label>
        )}

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Asunto *</span>
          <input
            required
            maxLength={120}
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Mensaje *</span>
          <textarea
            required
            rows={5}
            maxLength={5000}
            value={form.body}
            onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
            className={inputClass}
          />
          <span className="mt-1 block text-right text-xs text-slate-500">{form.body.length}/5000</span>
        </label>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={
              saving ||
              (form.audience === 'user' && recipients.length === 0) ||
              (form.awardPoints && canAwardPoints && (!Number.isInteger(Number(form.pointsAmount)) || Number(form.pointsAmount) <= 0))
            }
            className="message-submit-button rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? 'Enviando...' : 'Enviar mensaje'}
          </button>
          {canAwardPoints ? (
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={form.awardPoints}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  awardPoints: event.target.checked,
                }))}
                className="h-4 w-4 accent-emerald-600"
              />
              Enviar MayCoins
            </label>
          ) : (
            <span className="text-sm text-slate-500">Selecciona un destinatario elegible para enviar MayCoins.</span>
          )}
          {form.awardPoints && (
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              Cantidad
              <input
                type="number"
                min="1"
                step="1"
                required
                value={form.pointsAmount}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  pointsAmount: event.target.value,
                }))}
                className="w-28 rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-emerald-500"
              />
            </label>
          )}
        </div>
      </form>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Mensajes enviados</h2>
            <p className="mt-1 text-sm text-slate-600">Se muestran hasta los 100 más recientes que enviaste.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
          >
            Actualizar
          </button>
        </div>
        {loading && <p role="status" className="mt-4 text-slate-600">Cargando mensajes...</p>}
        {!loading && sentMessages.length === 0 && (
          <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-slate-600">
            Todavía no has enviado mensajes.
          </p>
        )}
        <ul className="mt-4 space-y-3">
          {sentMessages.map((item) => (
            <li key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.recipient_user_id
                      ? `Para: ${recipientLabels.get(item.recipient_user_id) ?? 'Usuario'}`
                      : 'Aviso para todos los usuarios'}
                  </p>
                </div>
                <time className="text-xs text-slate-500">{formatDate(item.created_at)}</time>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-700">{item.body}</p>
              {item.reward_points > 0 && (
                <p className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                <MayCoinAmount amount={item.reward_points} iconClassName="h-4 w-4" /> enviados {item.recipient_user_id ? 'al destinatario' : 'a cada cliente'}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
