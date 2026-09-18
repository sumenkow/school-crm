'use client';

import { saveInteractionToStorage, TimelineInteraction } from './timelineStorage';

export interface ContactWorkflowParams {
  phone?: string;
  telegram?: string;
  template?: string;
  leadId?: string;
  leadName?: string;
  studentId?: string;
  parentId?: string;
  clientName?: string;
  targetRole?: string;
  author?: string;
}

/**
 * Parses phone and opens WhatsApp with prefilled message,
 * immediately logging an "Outgoing WhatsApp Contact" event to the timeline.
 */
export function triggerWhatsAppContact(params: ContactWorkflowParams): void {
  const rawPhone = params.phone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');

  if (!cleanPhone) {
    if (typeof window !== 'undefined') {
      alert('У контакта не указан номер телефона');
    }
    return;
  }

  const url = `https://wa.me/${cleanPhone}${params.template ? `?text=${encodeURIComponent(params.template)}` : ''}`;

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // Record interaction in unified timeline
  const now = new Date();
  const dateStr = now.toLocaleDateString('ru-RU');
  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const displayName = params.clientName || params.leadName;

  const interaction: TimelineInteraction = {
    id: `int_wa_${Date.now()}`,
    leadId: params.leadId,
    studentId: params.studentId,
    parentId: params.parentId,
    studentName: displayName,
    parentName: params.parentId ? displayName : undefined,
    occurredAt: `${dateStr}, ${timeStr}`,
    createdAt: now.toISOString(),
    channel: 'whatsapp',
    type: 'follow_up',
    author: params.author || 'Менеджер CRM',
    content: `💬 Исходящий контакт в WhatsApp (${displayName || rawPhone}).${params.template ? ` Текст: «${params.template.slice(0, 100)}${params.template.length > 100 ? '...' : ''}»` : ''}`,
    result: 'Сообщение отправлено',
    targetType: params.parentId ? 'parent' : params.studentId ? 'student' : undefined,
    targetName: displayName,
    targetRole: params.targetRole || (params.parentId ? 'Родитель' : 'Клиент'),
  };

  saveInteractionToStorage(interaction);
}

/**
 * Parses username/phone and opens Telegram (via tg:// or https://t.me/),
 * immediately logging an "Outgoing Telegram Contact" event to the timeline.
 */
export function triggerTelegramContact(params: ContactWorkflowParams): void {
  const tgUser = (params.telegram || '').trim();
  const rawPhone = params.phone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');

  let url = '';
  if (tgUser) {
    const cleanUser = tgUser.replace(/^@/, '').replace('https://t.me/', '').trim();
    if (cleanUser) {
      url = `https://t.me/${cleanUser}`;
    }
  }

  if (!url && cleanPhone) {
    url = `https://t.me/+${cleanPhone}`;
  }

  if (!url) {
    if (typeof window !== 'undefined') {
      alert('У контакта не указан Telegram или телефон');
    }
    return;
  }

  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // Record interaction in unified timeline
  const now = new Date();
  const dateStr = now.toLocaleDateString('ru-RU');
  const timeStr = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const displayName = params.clientName || params.leadName;

  const interaction: TimelineInteraction = {
    id: `int_tg_${Date.now()}`,
    leadId: params.leadId,
    studentId: params.studentId,
    parentId: params.parentId,
    studentName: displayName,
    parentName: params.parentId ? displayName : undefined,
    occurredAt: `${dateStr}, ${timeStr}`,
    createdAt: now.toISOString(),
    channel: 'telegram',
    type: 'follow_up',
    author: params.author || 'Менеджер CRM',
    content: `✈️ Исходящий контакт в Telegram (${displayName || tgUser || rawPhone}).`,
    result: 'Чат открыт',
    targetType: params.parentId ? 'parent' : params.studentId ? 'student' : undefined,
    targetName: displayName,
    targetRole: params.targetRole || (params.parentId ? 'Родитель' : 'Клиент'),
  };

  saveInteractionToStorage(interaction);
}
