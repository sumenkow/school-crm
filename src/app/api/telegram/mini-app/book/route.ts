import { NextRequest, NextResponse } from 'next/server';
import { bookGroupLesson, bookIndividualLesson } from '@/lib/data/lessonStorage';
import { sendTelegramDirectMessage, resolveBotToken } from '@/lib/telegram/telegramClient';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      bookingType, // 'group' | 'individual'
      lessonId,
      teacherId,
      studentId,
      parentId,
      date,
      startTime,
      endTime,
      courseName,
      topic,
      isTrial,
      sendTelegramReminder = true,
      chatId,
    } = body;

    if (!studentId || !parentId) {
      return NextResponse.json(
        { success: false, error: 'Не указан ученик или профиль родителя' },
        { status: 400 }
      );
    }

    let result;

    if (bookingType === 'group') {
      if (!lessonId) {
        return NextResponse.json(
          { success: false, error: 'Не указан идентификатор занятия' },
          { status: 400 }
        );
      }

      result = bookGroupLesson({
        lessonId,
        studentId,
        parentId,
        isTrial: Boolean(isTrial),
      });
    } else if (bookingType === 'individual') {
      if (!teacherId || !date || !startTime || !endTime || !courseName) {
        return NextResponse.json(
          { success: false, error: 'Заполните все параметры индивидуального занятия' },
          { status: 400 }
        );
      }

      result = bookIndividualLesson({
        teacherId,
        studentId,
        parentId,
        date,
        startTime,
        endTime,
        courseName,
        topic,
        isTrial: Boolean(isTrial),
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Неверный тип бронирования' },
        { status: 400 }
      );
    }

    if (!result.success) {
      const statusCode = result.code === 'UNAUTHORIZED' ? 403 : result.code === 'FULL' || result.code === 'CONFLICT' ? 409 : 400;
      return NextResponse.json(
        { success: false, error: result.error, code: result.code },
        { status: statusCode }
      );
    }

    // Optional: Send Telegram confirmation message if bot is active and chatId provided
    const botToken = resolveBotToken();
    const targetChatId = chatId || (parentId.startsWith('@') || /^\d+$/.test(parentId) ? parentId : null);

    if (sendTelegramReminder && botToken && targetChatId && result.lesson) {
      const l = result.lesson;
      const typeLabel = l.isIndividual ? 'Индивидуальное занятие' : `Группа «${l.groupName}»`;
      const trialBadge = l.isTrial ? ' (🎯 Пробное)' : '';

      try {
        await sendTelegramDirectMessage({
          token: botToken,
          chatId: targetChatId,
          text: `✅ *Вы успешно записаны на занятие!*\n\n📚 *${typeLabel}*${trialBadge}\n📅 *Дата:* ${l.dateFormatted || l.date}\n⏰ *Время:* ${l.startTime} – ${l.endTime}\n👤 *Преподаватель:* ${l.teacherName}\n💻 *Формат:* Онлайн (Zoom)\n🔗 *Ссылка:* ${l.onlineMeetingUrl || 'Будет отправлена перед уроком'}\n\n_Напоминание придет за 1 час до начала занятия._`,
          parseMode: 'Markdown',
        });
      } catch (tgErr) {
        console.warn('Could not send booking confirmation to Telegram:', tgErr);
      }
    }

    // Direct persistence to Supabase database (eliminating phantom serverless bookings)
    try {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL && result.lesson) {
        const supabase = createAdminClient();
        const l = result.lesson;
        await supabase.from('lessons').upsert({
          id: l.id,
          group_id: l.groupId || null,
          teacher_id: l.teacherId || null,
          lesson_date: l.date,
          date: l.date,
          start_time: l.startTime,
          end_time: l.endTime,
          topic: l.topic || 'Занятие',
          online_meeting_url: l.onlineMeetingUrl || null,
          zoom_url: l.onlineMeetingUrl || null,
          status: l.status || 'scheduled',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });

        await supabase.from('attendance').upsert({
          lesson_id: l.id,
          student_id: studentId,
          status: 'not_marked',
          marked_at: new Date().toISOString(),
        }, { onConflict: 'lesson_id,student_id' });
      }
    } catch (dbErr) {
      console.warn('Supabase direct persistence warning in /api/telegram/mini-app/book:', dbErr);
    }

    return NextResponse.json({
      success: true,
      lesson: result.lesson,
    });
  } catch (err: any) {
    console.error('Error handling Mini App booking:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
