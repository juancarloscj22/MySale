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

Esta es una base de interfaz/prototipo: los productos, pedidos, métricas y usuarios son datos de muestra. Supabase está agregado como dependencia, pero todavía no está configurado ni conectado. La autenticación y los controles de rol no son seguridad real y deben integrarse con Supabase Auth y políticas RLS antes de usar datos o habilitar operaciones comerciales. Configura el número real de WhatsApp antes de publicar.

Consulta `avance_proyecto_mysale.txt` para el resumen de los avances realizados.
