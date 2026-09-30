# MySale Shop

Frontend inicial para la tienda MySale Shop, basado en React, Vite, React Router y Tailwind CSS.

## Ejecutar localmente

```powershell
cd frontend
npm install
npm run dev
```

Vite mostrará la URL local de desarrollo (por defecto, `http://localhost:5173/`).

## Estructura

La aplicación se encuentra en `frontend/`. Las vistas están organizadas por área en `src/views/` y los componentes compartidos, contexto del carrito, rutas y servicios están separados en sus carpetas correspondientes.

## Estado actual

El catálogo, registro e inicio de sesión ya usan Supabase. El inventario permite crear, editar y activar/desactivar productos; el checkout valida y guarda pedidos; clientes consultan su historial y administración gestiona los estados. El dashboard muestra métricas reales de pedidos, inventario, usuarios y ventas estimadas; la gestión de usuarios consulta perfiles reales y muestra correo, contacto, rol, estado y fecha de registro con paginación. La consola de desarrollador muestra diagnósticos de conexión/RLS y accesos a las herramientas; la configuración de tienda también se guarda en Supabase. La seguridad de datos se aplica con RLS y funciones transaccionales; los controles de rol de la interfaz complementan, pero no sustituyen, RLS.

Consulta `avance_proyecto_mysale.txt` para el resumen de los avances realizados.

## Esquema de Supabase

Las migraciones crean el esquema base, configuran RLS y habilitan el checkout. El público solo puede leer productos/categorías activos y la configuración pública; las cuentas solo pueden leer sus propios datos. Los cambios de catálogo/configuración y la administración de pedidos requieren un perfil `admin` o `developer`.

El registro solicita nombre, teléfono y correo; el checkout toma automáticamente nombre y teléfono del perfil y solo pide dirección, hora preferida de entrega y medio de pago. Si elige efectivo, puede indicar si requiere cambio. La sección **Mi cuenta** permite corregir sus datos. El RPC `create_order`, disponible únicamente para usuarios autenticados, valida el perfil y los datos de entrega, vuelve a consultar y bloquear productos, verifica stock/precio, descuenta existencias, guarda los precios como snapshot y registra el pedido en una transacción. También guarda la hora preferida de entrega (opcional), medio de pago (efectivo al recibir, transferencia bancaria o tarjeta al recibir) y preferencia de cambio para pagos en efectivo; el pago no se procesa en línea. Usa un identificador idempotente para que reintentos no dupliquen pedidos. No se aceptan precios ni envío proporcionados por el navegador. Después de guardar el pedido, se muestra una confirmación en la tienda y WhatsApp se abre solo al pulsar el enlace, en otra pestaña para mantener la página abierta.

Administración cambia el estado mediante `set_order_status`; no puede editar pedidos directamente. Cancelar un pedido antes de que entre en tránsito restaura el stock; los pedidos en tránsito o completados no se pueden cancelar y los cancelados no se pueden reabrir.

La hora preferida y el medio de pago aparecen en el historial del cliente y en la administración de pedidos, además de incluirse en el mensaje de WhatsApp.

El envío inicial es `5.00` y se puede ajustar en **Dev → Configuración de tienda** junto con la moneda y el número de WhatsApp. El checkout requiere un número de WhatsApp configurado. Confirma moneda y costo de envío antes de procesar pedidos reales.

La CLI de Supabase está incluida como dependencia de desarrollo del frontend. Las migraciones del directorio `supabase/migrations` están aplicadas en el proyecto enlazado. Para aplicar cambios futuros desde la raíz:

```powershell
npm --prefix frontend exec -- supabase login
npm --prefix frontend exec -- supabase link --project-ref hyfucataajcqzdxoiusy
npm --prefix frontend exec -- supabase db push
```

El último comando aplica las migraciones pendientes al proyecto enlazado. Para ejecutar Supabase localmente en vez de usar un proyecto alojado, también se requiere Docker Desktop.

Los registros nuevos reciben el rol `customer`. El rol `developer` incluye los permisos administrativos y acceso a las herramientas técnicas; `admin` no concede acceso a las rutas de desarrollador. La cuenta principal ya tiene el rol `developer`. Para promover cuentas adicionales, verifica primero al usuario en Supabase Auth y ejecuta en SQL Editor, con el UUID confirmado:

```sql
update public.profiles
set role = 'developer'
where id = '<uuid-confirmado>';
```

Para configurar el frontend, copia `frontend/.env.example` a `frontend/.env.local` y añade la URL y la clave pública del proyecto. `.env.local` está ignorado por Git; nunca pongas una clave `service_role` o secret en variables `VITE_*`.
