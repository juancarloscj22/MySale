import { supabase } from '../lib/supabaseClient';

const recipientPageSize = 500;

export async function getMessageRecipients() {
  const recipients = [];
  let start = 0;

  while (true) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'customer')
      .eq('blocked', false)
      .order('full_name', { ascending: true })
      .range(start, start + recipientPageSize - 1);

    if (error) throw error;
    if (!Array.isArray(data)) {
      throw new Error('Supabase no devolvió una lista válida de destinatarios.');
    }

    recipients.push(...data);
    if (data.length < recipientPageSize) return recipients;
    start += recipientPageSize;
  }
}

export async function getMyMessages(userId) {
  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, title, body, created_at, recipient_user_id, reward_points')
    .or(`recipient_user_id.is.null,recipient_user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  if (!Array.isArray(messages)) {
    throw new Error('Supabase no devolvió una lista válida de mensajes.');
  }
  if (messages.length === 0) return [];

  const { data: receipts, error: receiptsError } = await supabase
    .from('message_reads')
    .select('message_id, read_at')
    .eq('user_id', userId)
    .in('message_id', messages.map(({ id }) => id));

  if (receiptsError) throw receiptsError;
  if (!Array.isArray(receipts)) {
    throw new Error('Supabase no devolvió el estado de lectura de los mensajes.');
  }

  const readTimes = new Map(receipts.map(({ message_id, read_at }) => [message_id, read_at]));
  const { data: claims, error: claimsError } = await supabase
    .from('message_reward_claims')
    .select('message_id')
    .eq('user_id', userId)
    .in('message_id', messages.map(({ id }) => id));

  if (claimsError) throw claimsError;
  if (!Array.isArray(claims)) {
    throw new Error('Supabase no devolvió el estado de las MayCoins recibidas.');
  }

  const claimedMessages = new Set(claims.map(({ message_id }) => message_id));
  return messages.map((message) => ({
    ...message,
    readAt: readTimes.get(message.id) ?? null,
    pointsClaimed: claimedMessages.has(message.id),
  }));
}

export async function getSentMessages(userId) {
  const { data, error } = await supabase
    .from('messages')
    .select('id, title, body, created_at, recipient_user_id, reward_points')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  if (!Array.isArray(data)) {
    throw new Error('Supabase no devolvió el historial de mensajes enviados.');
  }
  return data;
}

export async function createMessage({ userId, recipientUserId, title, body, pointsAmount = 0 }) {
  const cleanTitle = title.trim();
  const cleanBody = body.trim();
  const rewardPoints = Number(pointsAmount);

  if (!cleanTitle || cleanTitle.length > 120) {
    throw new Error('El asunto debe tener entre 1 y 120 caracteres.');
  }
  if (!cleanBody || cleanBody.length > 5000) {
    throw new Error('El mensaje debe tener entre 1 y 5000 caracteres.');
  }
  if (!Number.isInteger(rewardPoints) || rewardPoints < 0) {
    throw new Error('La cantidad de MayCoins debe ser un entero igual o mayor que cero.');
  }

  const { error } = await supabase.from('messages').insert({
    created_by: userId,
    recipient_user_id: recipientUserId || null,
    title: cleanTitle,
    body: cleanBody,
    reward_points: rewardPoints,
  });

  if (error) throw error;
}

export async function markMessagesRead(userId, messageIds) {
  if (messageIds.length === 0) return;

  const { error } = await supabase
    .from('message_reads')
    .upsert(
      messageIds.map((messageId) => ({ message_id: messageId, user_id: userId })),
      { onConflict: 'message_id,user_id', ignoreDuplicates: true },
    );

  if (error) throw error;
}

export async function claimMessagePoints(messageId) {
  const { data, error } = await supabase.rpc('claim_message_points', {
    p_message_id: messageId,
  });

  if (error) throw error;
  const awardedPoints = Number(data);
  if (!Number.isInteger(awardedPoints) || awardedPoints < 0) {
    throw new Error('Supabase devolvió un resultado inválido al recibir las MayCoins.');
  }
  return awardedPoints;
}

export async function notifyPurchaseMissionCompleted({ orderId, mission }) {
  if (!orderId || !mission?.id || !mission.title) {
    throw new Error('Faltan datos para notificar la misión completada.');
  }

  const { data, error } = await supabase.rpc('notify_purchase_mission_completed', {
    p_order_id: orderId,
    p_mission_id: mission.id,
  });

  if (error) throw error;
  if (typeof data !== 'boolean') {
    throw new Error('Supabase devolvió un resultado inválido al notificar la misión completada.');
  }
  return data;
}

export async function getPurchaseMissionRewards(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('purchase_reward_mission_notifications')
    .select('mission_id, mission_title, points_awarded, purchase_target, order_id, claimed_at')
    .eq('user_id', userId)
    .not('points_awarded', 'is', null)
    .order('notified_at', { ascending: false });

  if (error) throw error;
  if (!Array.isArray(data)) {
    throw new Error('Supabase no devolvió las misiones de compra completadas.');
  }
  return data;
}

export async function claimPurchaseMissionReward(missionId) {
  const { data, error } = await supabase.rpc('claim_purchase_mission_reward', {
    p_mission_id: missionId,
  });

  if (error) throw error;
  const balance = Number(data);
  if (!Number.isInteger(balance) || balance < 0) {
    throw new Error('Supabase devolvió un saldo inválido al canjear la misión.');
  }
  return balance;
}
