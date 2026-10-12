import { useCallback, useEffect, useState } from 'react';
import { claimMessagePoints, getMyMessages, markMessagesRead } from '../services/messages';
import { loadUserRewards } from '../services/rewards';
import MayCoinAmount from './MayCoinAmount';

const formatDate = (value) =>
  new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export default function MessageInbox({ userId, navbarBackgroundImageUrl, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageCount, setMessageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [claimingMessageId, setClaimingMessageId] = useState('');

  const refreshUnreadCount = useCallback(async () => {
    try {
      const result = await getMyMessages(userId);
      setMessageCount(result.length);
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshUnreadCount(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;

    const loadMessages = async () => {
      try {
        const result = await getMyMessages(userId);
        if (!active) return;
        setMessages(result);
        const unread = result.filter((item) => !item.readAt).map((item) => item.id);
        await markMessagesRead(userId, unread);
        if (!active) return;
        const viewedAt = new Date().toISOString();
        setMessages(result.map((item) => ({ ...item, readAt: item.readAt ?? viewedAt })));
        setMessageCount(result.length);
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadMessages();
    return () => {
      active = false;
    };
  }, [open, userId]);

  const handleClaimPoints = async (messageId) => {
    setError('');
    setClaimingMessageId(messageId);
    try {
      await claimMessagePoints(messageId);
      await loadUserRewards(userId);
      setMessages((currentMessages) => currentMessages.map((message) => (
        message.id === messageId ? { ...message, pointsClaimed: true } : message
      )));
    } catch (claimError) {
      setError(claimError.message);
    } finally {
      setClaimingMessageId('');
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label={`Mensajes${messageCount ? `, ${messageCount} recibidos` : ''}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          if (!open) {
            setLoading(true);
            setError('');
          }
          setOpen(!open);
          onNavigate();
        }}
        className="navbar-message-button inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-2 text-base font-semibold text-black shadow-sm transition hover:bg-slate-700 sm:px-4"
      >
        <span aria-hidden="true">✉</span>
        <span className="hidden sm:inline">Mensajes</span>
        {messageCount > 0 && (
          <span className="navbar-message-count rounded-full bg-emerald-500 px-2 py-0.5 text-sm font-semibold text-slate-900">
            {messageCount > 99 ? '99+' : messageCount}
          </span>
        )}
      </button>

      {open && (
        <section
          role="dialog"
          aria-label="Bandeja de mensajes"
          className="fixed left-2 right-2 top-36 z-[60] mx-auto max-h-[calc(100dvh-10rem)] w-auto max-w-md overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-200 bg-white/45 p-4 text-white shadow-2xl sm:p-5 md:absolute md:left-auto md:right-0 md:top-full md:mx-0 md:max-h-[min(70vh,36rem)] md:w-[calc(100vw-1rem)]"
          style={navbarBackgroundImageUrl ? {
            backgroundImage: `url("${navbarBackgroundImageUrl}")`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          } : undefined}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-white">Mis mensajes</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar mensajes"
              className="rounded-full border border-slate-300 px-3 py-1 font-bold text-black"
            >
              ×
            </button>
          </div>
          {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-base text-red-700">{error}</p>}
          {loading && <p role="status" className="mt-4 text-base text-white">Cargando mensajes...</p>}
          {!loading && !error && messages.length === 0 && (
            <p className="mt-4 text-base text-white">No tienes mensajes todavía.</p>
          )}
          <ul className="mt-3 space-y-3">
            {messages.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 bg-white/70 p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-bold text-white">{item.title}</h3>
                  {!item.readAt && <span className="shrink-0 text-sm font-semibold text-white">Nuevo</span>}
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-base text-white">{item.body}</p>
                {item.reward_points > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {item.pointsClaimed ? (
                      <p className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
                        Recibiste <MayCoinAmount amount={item.reward_points} iconClassName="h-4 w-4" />
                      </p>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-white">
                          Tienes <MayCoinAmount amount={item.reward_points} iconClassName="h-4 w-4" /> pendientes
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleClaimPoints(item.id)}
                          disabled={claimingMessageId !== ''}
                          className="rounded-full bg-amber-400 px-4 py-1.5 text-xs font-bold text-slate-900 transition hover:bg-amber-500 disabled:cursor-wait disabled:opacity-60"
                        >
                          {claimingMessageId === item.id ? 'Recibiendo...' : 'Recibir'}
                        </button>
                      </>
                    )}
                  </div>
                )}
                <time className="mt-3 block text-sm text-white">{formatDate(item.created_at)}</time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
