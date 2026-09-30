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

El catálogo, registro e inicio de sesión ya usan Supabase. Las métricas, pedidos e interfaces de administración aún son prototipos. La seguridad de datos se aplica con RLS; los controles de rol de la interfaz son solo navegación. Configura el número real de WhatsApp antes de publicar.

Consulta `avance_proyecto_mysale.txt` para el resumen de los avances realizados.

## Esquema de Supabase

Las migraciones `20260929162000_initial_schema.sql` y `20260929172000_catalog_and_auth_policies.sql` crean el esquema base y configuran RLS para catálogo, perfiles y administración. El catálogo activo y la configuración pública se pueden consultar; los usuarios solo pueden leer su propio perfil y pedidos. Los cambios administrativos requieren el rol `admin`. Clientes no pueden modificar perfiles ni insertar pedidos directamente desde el navegador; la creación segura de pedidos requiere una función transaccional que valide precios y stock. Ambas migraciones ya están aplicadas al proyecto enlazado.

La moneda del esquema es `MXN` provisional; confirmar que corresponde a la tienda antes de procesar pedidos.

La CLI de Supabase está incluida como dependencia de desarrollo del frontend. Para aplicar cambios futuros desde la raíz:

```powershell
npm --prefix frontend exec -- supabase login
npm --prefix frontend exec -- supabase link --project-ref hyfucataajcqzdxoiusy
npm --prefix frontend exec -- supabase db push
```

El último comando aplica las migraciones pendientes al proyecto enlazado. Para ejecutar Supabase localmente en vez de usar un proyecto alojado, también se requiere Docker Desktop.

Los registros nuevos reciben el rol `customer`. No se puede autoasignar un rol privilegiado: para promover la primera cuenta de administración, verifica primero el usuario en Supabase Auth y ejecuta en SQL Editor, con el UUID confirmado:

```sql
update public.profiles
set role = 'admin'
where id = '<uuid-confirmado>';
```

Para configurar el frontend, copia `frontend/.env.example` a `frontend/.env.local` y añade la URL y la clave pública del proyecto. `.env.local` está ignorado por Git; nunca pongas una clave `service_role` o secret en variables `VITE_*`.
