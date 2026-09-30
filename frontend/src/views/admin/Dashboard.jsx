import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderAcceptanceControl from '../../components/OrderAcceptanceControl';
import { getAdminDashboardMetrics } from '../../services/dashboard';
import { getOrdersForDeliveryMonth } from '../../services/orders';

const formatNumber = (value) => new Intl.NumberFormat('es-MX').format(value);
const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const statusLabels = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  in_transit: 'En tránsito',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const [calendarOrders, setCalendarOrders] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState('');

  useEffect(() => {
    let active = true;

    getAdminDashboardMetrics()
      .then((result) => {
        if (active) setMetrics(result);
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
  }, []);

  useEffect(() => {
    let active = true;

    getOrdersForDeliveryMonth(calendarMonth.getFullYear(), calendarMonth.getMonth())
      .then((result) => {
        if (active) {
          setCalendarOrders(result);
          setCalendarError('');
        }
      })
      .catch((loadError) => {
        if (active) setCalendarError(loadError.message);
      })
      .finally(() => {
        if (active) setCalendarLoading(false);
      });

    return () => {
      active = false;
    };
  }, [calendarMonth]);

  const moveCalendar = (offset) => {
    const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1);
    setCalendarLoading(true);
    setCalendarError('');
    setCalendarMonth(nextMonth);
    setSelectedDate(dateKey(nextMonth));
  };

  const monthTitle = new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric',
  }).format(calendarMonth);
  const firstWeekday = (new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay() + 6) % 7;
  const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
  const calendarCells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const ordersByDate = calendarOrders.reduce((ordersByDay, order) => {
    ordersByDay[order.delivery_date] = [...(ordersByDay[order.delivery_date] ?? []), order];
    return ordersByDay;
  }, {});
  const selectedDayOrders = ordersByDate[selectedDate] ?? [];
  const selectedDateLabel = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'full',
  }).format(new Date(`${selectedDate}T12:00:00`));

  const cards = metrics
    ? [
        {
          label: 'Pedidos de hoy',
          value: formatNumber(metrics.ordersToday),
          tone: 'bg-emerald-100 text-emerald-700',
        },
        {
          label: 'Productos con stock bajo',
          value: formatNumber(metrics.lowStockProducts),
          tone: 'bg-amber-100 text-amber-700',
        },
        {
          label: 'Usuarios registrados',
          value: formatNumber(metrics.users),
          tone: 'bg-cyan-500 text-slate-900',
        },
        {
          label: 'Ventas estimadas de hoy',
          value: new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: metrics.currencyCode,
          }).format(metrics.salesToday),
          tone: 'bg-violet-100 text-violet-700',
        },
      ]
    : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-black text-slate-900">Dashboard</h1>
      <OrderAcceptanceControl />
      {loading && <p className="mt-8 text-slate-600">Cargando métricas...</p>}
      {error && (
        <p role="alert" className="mt-8 rounded-xl bg-red-50 p-4 text-red-700">
          No se pudieron cargar las métricas del dashboard: {error}
        </p>
      )}
      {metrics && (
        <>
          <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((item) => (
              <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${item.tone}`}>{item.label}</div>
                <p className="mt-4 text-3xl font-black text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Stock bajo: 5 unidades o menos. Ventas estimadas: pedidos de hoy excepto los cancelados.
          </p>
        </>
      )}

      <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Calendario de entregas</h2>
            <p className="mt-1 text-sm text-slate-600">Pedidos organizados por fecha y hora preferida.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => moveCalendar(-1)}
              aria-label="Mes anterior"
              className="rounded-full border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              ←
            </button>
            <h3 className="min-w-36 text-center font-bold capitalize text-slate-900">{monthTitle}</h3>
            <button
              type="button"
              onClick={() => moveCalendar(1)}
              aria-label="Mes siguiente"
              className="rounded-full border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
            >
              →
            </button>
          </div>
        </div>

        {calendarError && (
          <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            No se pudo cargar el calendario de entregas: {calendarError}
          </p>
        )}

        <div className="mt-6 grid grid-cols-7 gap-1 sm:gap-2">
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day) => (
            <div key={day} className="py-2 text-center text-xs font-bold uppercase text-slate-500">{day}</div>
          ))}
          {calendarCells.map((day, index) => {
            if (day === null) return <div key={`empty-${index}`} aria-hidden="true" />;
            const dayDate = dateKey(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day));
            const dayOrders = ordersByDate[dayDate] ?? [];
            const selected = selectedDate === dayDate;
            return (
              <button
                key={dayDate}
                type="button"
                aria-pressed={selected}
                onClick={() => setSelectedDate(dayDate)}
                className={`min-h-16 rounded-xl border p-2 text-left transition sm:min-h-20 ${
                  selected
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-slate-100 bg-slate-50 hover:border-emerald-300'
                }`}
              >
                <span className="text-sm font-semibold text-slate-800">{day}</span>
                {dayOrders.length > 0 && (
                  <span className="mt-1 block text-xs font-bold text-emerald-700">
                    {dayOrders.length} {dayOrders.length === 1 ? 'pedido' : 'pedidos'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {calendarLoading && <p className="mt-4 text-sm text-slate-500">Cargando pedidos del mes...</p>}

        <div className="mt-6 border-t border-slate-100 pt-5">
          <h3 className="font-bold capitalize text-slate-900">{selectedDateLabel}</h3>
          {!calendarLoading && selectedDayOrders.length === 0 && (
            <p className="mt-3 text-sm text-slate-500">No hay pedidos programados para este día.</p>
          )}
          {selectedDayOrders.length > 0 && (
            <ul className="mt-3 space-y-2">
              {selectedDayOrders.map((order) => (
                <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                  <div>
                    <p className="font-semibold text-slate-900">{order.delivery_name}</p>
                    <p className="break-all font-mono text-xs text-slate-500">{order.id}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-bold text-emerald-700">
                      {order.delivery_time ? String(order.delivery_time).slice(0, 5) : 'Hora no especificada'}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                      {statusLabels[order.status] ?? order.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-slate-900">Administración de la tienda</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              to: '/admin/inventory',
              title: 'Inventario',
              description: 'Agregar productos, actualizar precios y stock, y controlar su publicación.',
              action: 'Administrar inventario',
            },
            {
              to: '/admin/orders',
              title: 'Pedidos',
              description: 'Consultar y gestionar los pedidos de la tienda.',
              action: 'Ver pedidos',
            },
            {
              to: '/admin/users',
              title: 'Usuarios',
              description: 'Consultar las cuentas registradas en la tienda.',
              action: 'Ver usuarios',
            },
            {
              to: '/admin/coupons',
              title: 'Cupones',
              description: 'Crear códigos promocionales porcentuales y administrar su vigencia.',
              action: 'Administrar cupones',
            },
          ].map((section) => (
            <Link
              key={section.to}
              to={section.to}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
            >
              <h3 className="text-xl font-bold text-slate-900">{section.title}</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-600">{section.description}</p>
              <span className="mt-5 inline-flex text-sm font-semibold text-emerald-700 group-hover:text-emerald-800">
                {section.action} <span aria-hidden="true" className="ml-2">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
