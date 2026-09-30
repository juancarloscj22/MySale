import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405);
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization) {
    return jsonResponse({ error: 'Debes iniciar sesión.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Falta configuración interna requerida para gestionar usuarios.');
    return jsonResponse({ error: 'El servicio de gestión no está configurado.' }, 500);
  }

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerResult, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerResult.user) {
    return jsonResponse({ error: 'La sesión no es válida.' }, 401);
  }

  const { data: callerProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('id, role, blocked')
    .eq('id', callerResult.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('No se pudo validar el perfil del operador:', profileError.message);
    return jsonResponse({ error: 'No se pudo validar el permiso de desarrollador.' }, 500);
  }
  if (callerProfile?.role !== 'developer' || callerProfile.blocked) {
    return jsonResponse({ error: 'Solo un desarrollador activo puede gestionar usuarios.' }, 403);
  }

  let body: { userId?: unknown; action?: unknown; blocked?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'El cuerpo de la solicitud no es JSON válido.' }, 400);
  }

  const userId = typeof body.userId === 'string' ? body.userId : '';
  const action = body.action;
  const isValidUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

  if (!isValidUuid || (action !== 'delete' && action !== 'set_blocked')) {
    return jsonResponse({ error: 'La acción o la cuenta seleccionada no es válida.' }, 400);
  }
  if (userId === callerResult.user.id) {
    return jsonResponse({ error: 'No puedes bloquear ni eliminar tu propia cuenta.' }, 400);
  }
  if (action === 'set_blocked' && typeof body.blocked !== 'boolean') {
    return jsonResponse({ error: 'Indica si la cuenta debe quedar bloqueada.' }, 400);
  }

  const { data: targetProfile, error: targetError } = await adminClient
    .from('profiles')
    .select('id, role, blocked')
    .eq('id', userId)
    .maybeSingle();

  if (targetError) {
    console.error('No se pudo consultar el perfil seleccionado:', targetError.message);
    return jsonResponse({ error: 'No se pudo consultar la cuenta seleccionada.' }, 500);
  }
  if (!targetProfile) {
    return jsonResponse({ error: 'La cuenta seleccionada ya no existe.' }, 404);
  }

  if (targetProfile.role === 'developer') {
    return jsonResponse({ error: 'Las cuentas Dev están protegidas contra bloqueo y eliminación.' }, 403);
  }

  if (action === 'set_blocked') {
    const blocked = body.blocked as boolean;
    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: blocked ? '876000h' : 'none',
    });

    if (authUpdateError) {
      console.error('No se pudo aplicar el bloqueo en Auth:', authUpdateError.message);
      return jsonResponse({ error: 'No se pudo cambiar el estado de acceso de la cuenta.' }, 500);
    }

    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ blocked })
      .eq('id', userId);

    if (updateError) {
      const { error: rollbackError } = await adminClient.auth.admin.updateUserById(userId, {
        ban_duration: targetProfile.blocked ? '876000h' : 'none',
      });
      if (rollbackError) {
        console.error('Falló la reversión del bloqueo en Auth:', rollbackError.message);
      }
      console.error('No se pudo actualizar el estado del perfil:', updateError.message);
      return jsonResponse({
        error: rollbackError
          ? 'No se pudo sincronizar el bloqueo; requiere revisión de soporte.'
          : 'No se pudo guardar el estado de bloqueo del perfil.',
      }, 500);
    }

    return jsonResponse({ success: true, blocked });
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error('No se pudo eliminar la cuenta seleccionada:', deleteError.message);
    return jsonResponse({ error: 'No se pudo eliminar la cuenta seleccionada.' }, 500);
  }

  return jsonResponse({ success: true, deleted: true });
});
