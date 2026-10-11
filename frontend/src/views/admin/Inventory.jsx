import { useEffect, useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { deleteProduct, getProducts, saveProduct, setProductActive } from '../../services/products';

const emptyForm = {
  id: '',
  name: '',
  description: '',
  price: '',
  discount_percent: '0',
  brand: '',
  category: '',
  flavors: [{ id: null, flavor: '', image_url: '', stock: '0', active: true }],
  nicotine: '',
  puffs: '',
  image_url: '',
  active: true,
};

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-500';

export default function Inventory() {
  const { profile } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyProductId, setBusyProductId] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    let active = true;

    getProducts({ includeInactive: true })
      .then((result) => {
        if (active) setProducts(result);
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

  const refreshProducts = async () => {
    try {
      setProducts(await getProducts({ includeInactive: true }));
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  const updateForm = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const addFlavor = () => {
    setForm((current) => ({
      ...current,
      flavors: [...current.flavors, { id: null, flavor: '', image_url: '', stock: '0', active: true }],
    }));
  };

  const updateFlavor = (index, field, value) => {
    setForm((current) => ({
      ...current,
      flavors: current.flavors.map((flavor, flavorIndex) =>
        flavorIndex === index ? { ...flavor, [field]: value } : flavor,
      ),
    }));
  };

  const removeFlavor = (index) => {
    setForm((current) => {
      const flavor = current.flavors[index];
      return {
        ...current,
        flavors: flavor.id
          ? current.flavors.map((item, flavorIndex) =>
              flavorIndex === index ? { ...item, active: false } : item,
            )
          : current.flavors.filter((_, flavorIndex) => flavorIndex !== index),
      };
    });
  };

  const openNewForm = () => {
    setForm(emptyForm);
    setFormError('');
    setMessage('');
    setFormOpen(true);
  };

  const openEditForm = (product) => {
    setForm({
      id: product.id,
      name: product.name,
      description: product.description ?? '',
      price: String(product.originalPrice),
      discount_percent: String(product.discount_percent ?? 0),
      brand: product.brand ?? '',
      category: product.category === 'Vape' ? '' : product.category,
      flavors: product.flavors.map((flavor) => ({
        ...flavor,
        stock: String(flavor.stock),
      })),
      nicotine: product.nicotine ?? '',
      puffs: product.puffs ?? '',
      image_url: product.image_url ?? '',
      active: product.active,
    });
    setFormError('');
    setMessage('');
    setFormOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError('');
    setFormError('');
    setMessage('');

    const price = Number(form.price);
    const discountPercent = Number(form.discount_percent);
    const puffs = form.puffs === '' ? null : Number(form.puffs);
    const activeFlavors = form.flavors.filter((flavor) => flavor.active);

    if (!form.name.trim()) {
      setFormError('El nombre del producto es obligatorio.');
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setFormError('El precio debe ser un número válido mayor o igual a cero.');
      return;
    }
    if (!Number.isFinite(discountPercent) || discountPercent < 0 || discountPercent > 100) {
      setFormError('El descuento debe ser un porcentaje entre 0 y 100.');
      return;
    }
    if (activeFlavors.length === 0) {
      setFormError('Agrega al menos un sabor disponible.');
      return;
    }
    const flavorNames = form.flavors.map((flavor) => flavor.flavor.trim().toLocaleLowerCase());
    if (form.flavors.some((flavor, index) => flavorNames[index] && flavorNames.indexOf(flavorNames[index]) !== index)) {
      setFormError('Los sabores no pueden repetirse.');
      return;
    }
    if (form.flavors.some((flavor) => !flavor.flavor.trim() || !Number.isInteger(Number(flavor.stock)) || Number(flavor.stock) < 0)) {
      setFormError('Cada sabor debe tener un nombre y un stock entero mayor o igual a cero.');
      return;
    }
    if (puffs !== null && (!Number.isInteger(puffs) || puffs <= 0)) {
      setFormError('Las caladas deben ser un entero mayor que cero.');
      return;
    }

    setSaving(true);
    try {
      await saveProduct(form);
      setFormOpen(false);
      setForm(emptyForm);
      setMessage(form.id ? 'Producto actualizado.' : 'Producto creado.');
      await refreshProducts();
    } catch (saveError) {
      setFormError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (product) => {
    const nextActive = !product.active;
    setBusyProductId(product.id);
    setError('');
    setMessage('');

    try {
      await setProductActive(product.id, nextActive);
      setMessage(nextActive ? 'Producto activado.' : 'Producto desactivado.');
      await refreshProducts();
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setBusyProductId('');
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`¿Eliminar permanentemente "${product.name}" del inventario? Los pedidos anteriores conservarán su información.`)) {
      return;
    }

    setBusyProductId(product.id);
    setError('');
    setMessage('');

    try {
      await deleteProduct(product.id);
      setMessage(`Producto "${product.name}" eliminado.`);
      await refreshProducts();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setBusyProductId('');
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Administración</p>
          <h1 className="mt-2 text-4xl font-black text-slate-900">Inventario</h1>
        </div>
        <button
          type="button"
          onClick={openNewForm}
          className="rounded-full border-2 border-emerald-700 bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-emerald-600"
        >
          Nuevo producto
        </button>
      </div>

      {message && <p role="status" className="mt-6 rounded-xl bg-emerald-50 p-4 text-emerald-800">{message}</p>}
      {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">No se pudo completar la operación: {error}</p>}

      {formOpen && (
        <form onSubmit={handleSave} className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-slate-900">{form.id ? 'Editar producto' : 'Crear producto'}</h2>
            <button type="button" onClick={() => setFormOpen(false)} className="text-sm font-semibold text-slate-500 hover:text-slate-900">
              Cerrar
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Nombre *</span>
              <input name="name" required value={form.name} onChange={updateForm} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Marca</span>
              <input name="brand" value={form.brand} onChange={updateForm} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Precio *</span>
              <input name="price" type="number" min="0" step="0.01" required value={form.price} onChange={updateForm} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Descuento (%)</span>
              <input name="discount_percent" type="number" min="0" max="100" step="0.01" value={form.discount_percent} onChange={updateForm} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Categoría</span>
              <input name="category" value={form.category} onChange={updateForm} className={inputClass} placeholder="Ej. Disposables" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Nicotina</span>
              <input name="nicotine" value={form.nicotine} onChange={updateForm} className={inputClass} placeholder="Ej. 3%" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Caladas</span>
              <input name="puffs" type="number" min="1" step="1" value={form.puffs} onChange={updateForm} className={inputClass} />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700">URL de imagen</span>
              <input name="image_url" type="url" value={form.image_url} onChange={updateForm} className={inputClass} placeholder="https://" />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Descripción</span>
              <textarea name="description" rows="3" value={form.description} onChange={updateForm} className={inputClass} />
            </label>
            <fieldset className="space-y-3 md:col-span-2">
              <legend className="mb-2 text-sm font-semibold text-slate-700">Sabores y stock por sabor *</legend>
              {form.flavors.map((flavor, index) => (
                <div key={flavor.id ?? `new-${index}`} className={`grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_10rem_auto] ${flavor.active ? 'border-slate-200' : 'border-slate-100 bg-slate-50 opacity-70'}`}>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">Sabor</span>
                    <input
                      value={flavor.flavor}
                      onChange={(event) => updateFlavor(index, 'flavor', event.target.value)}
                      required={flavor.active}
                      disabled={!flavor.active}
                      className={inputClass}
                      placeholder="Ej. Mango"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">Stock</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={flavor.stock}
                      onChange={(event) => updateFlavor(index, 'stock', event.target.value)}
                      required={flavor.active}
                      disabled={!flavor.active}
                      className={inputClass}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-xs font-semibold text-slate-500">URL de imagen del sabor</span>
                    <input
                      type="url"
                      value={flavor.image_url ?? ''}
                      onChange={(event) => updateFlavor(index, 'image_url', event.target.value)}
                      disabled={!flavor.active}
                      maxLength={2048}
                      className={inputClass}
                      placeholder="https://"
                    />
                  </label>
                  {flavor.active ? (
                    <button type="button" onClick={() => removeFlavor(index)} className="self-end rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 sm:col-start-3 sm:row-start-1">
                      Quitar
                    </button>
                  ) : (
                    <button type="button" onClick={() => updateFlavor(index, 'active', true)} className="self-end rounded-full border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 sm:col-start-3 sm:row-start-1">
                      Reactivar
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addFlavor} className="rounded-full border-2 border-blue-700 bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-200">
                Agregar sabor
              </button>
            </fieldset>
            <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 md:col-span-2">
              <input name="active" type="checkbox" checked={form.active} onChange={updateForm} className="h-4 w-4 accent-emerald-500" />
              Disponible en el catálogo
            </label>
          </div>

          {formError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{formError}</p>}

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="rounded-full border-2 border-emerald-700 bg-emerald-100 px-6 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar producto'}
            </button>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-full border-2 border-red-700 bg-red-100 px-6 py-3 text-sm font-bold text-red-700 transition hover:bg-red-200">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading && <p className="py-8 text-slate-600">Cargando inventario...</p>}
      {!loading && !error && products.length === 0 && (
        <p className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          El inventario está vacío. Crea el primer producto para publicarlo en el catálogo.
        </p>
      )}

      {!loading && products.length > 0 && (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-4">Producto</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Sabores / stock</th>
                <th className="p-4">Precio</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-slate-200">
                  <td className="p-4">
                    <p className="font-semibold text-slate-900">{product.name}</p>
                    <p className="text-xs text-slate-500">{product.brand || 'Sin marca'}</p>
                  </td>
                  <td className="p-4">{product.category}</td>
                  <td className="p-4">
                    <div className="space-y-1">
                      {product.flavors.map((flavor) => (
                        <p key={flavor.id} className="text-xs text-slate-600">
                          {flavor.flavor}: {flavor.stock}{flavor.active ? '' : ' (inactivo)'}
                        </p>
                      ))}
                      <p className="border-t border-slate-100 pt-1 font-semibold">Total: {product.stock}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    {product.discount_percent > 0 ? (
                      <>
                        <p className="font-bold text-slate-900">
                          ${(product.originalPrice * (100 - product.discount_percent) / 100).toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-500 line-through">${product.originalPrice.toFixed(2)}</p>
                        <p className="text-xs font-semibold text-pink-700">-{product.discount_percent}%</p>
                      </>
                    ) : `$${product.originalPrice.toFixed(2)}`}
                  </td>
                  <td className="p-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${!product.active ? 'bg-slate-100 text-slate-600' : product.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {!product.active ? 'Inactivo' : product.stock > 0 ? 'Disponible' : 'Agotado'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => openEditForm(product)} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={busyProductId === product.id}
                        onClick={() => handleToggleActive(product)}
                        className="rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {busyProductId === product.id ? 'Guardando...' : product.active ? 'Desactivar' : 'Activar'}
                      </button>
                      {profile?.role === 'developer' && (
                        <button
                          type="button"
                          disabled={busyProductId === product.id}
                          onClick={() => void handleDelete(product)}
                          className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          {busyProductId === product.id ? 'Procesando...' : 'Eliminar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
