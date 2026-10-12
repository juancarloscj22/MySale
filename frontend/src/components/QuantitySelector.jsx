export default function QuantitySelector({ value, onChange, max, disabled = false }) {
  const updateValue = (nextValue) => {
    const quantity = Number.parseInt(nextValue, 10);
    if (Number.isNaN(quantity)) return;
    onChange(Math.min(Math.max(1, quantity), max));
  };

  return (
    <div className="flex shrink-0 items-center rounded-xl border border-slate-300 bg-white text-slate-900">
      <button
        type="button"
        aria-label="Disminuir cantidad"
        onClick={() => updateValue(value - 1)}
        disabled={disabled || value <= 1}
        className="quantity-decrease flex h-10 w-10 items-center justify-center rounded-full border border-red-500 bg-white p-0 text-xl font-bold text-red-600 shadow-[inset_2px_2px_3px_rgba(255,255,255,0.9),inset_-2px_-2px_3px_rgba(15,23,42,0.2)] disabled:cursor-not-allowed disabled:text-slate-300"
      >
        <span>−</span>
      </button>
      <span
        aria-label={`Cantidad: ${value}`}
        className="flex h-10 min-w-10 items-center justify-center px-1 text-center text-lg font-bold tabular-nums"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label="Aumentar cantidad"
        onClick={() => updateValue(value + 1)}
        disabled={disabled || value >= max}
        className="quantity-increase flex h-10 w-10 items-center justify-center rounded-full border border-emerald-500 bg-white p-0 text-xl font-bold shadow-[inset_2px_2px_3px_rgba(255,255,255,0.9),inset_-2px_-2px_3px_rgba(15,23,42,0.2)] disabled:cursor-not-allowed disabled:text-slate-300"
      >
        +
      </button>
    </div>
  );
}
