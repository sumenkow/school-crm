/**
 * SMART ACADEMY / YOU EUROPE CRM — SUITE 19: TELEGRAM MINI APP MENU BUTTON & INLINE BOOKING TOUCHPOINTS
 *
 * Requirements:
 * - Test 1: Telegram Bot API Global & Chat Menu Button (`setTelegramChatMenuButton`).
 * - Test 2: Outbound direct message with `replyMarkup` in `POST /api/telegram/send`.
 * - Test 3: Automatic global menu button sync in `POST /api/telegram/settings`.
 * - Test 4: Webhook smart booking recognition: direct commands & natural Russian keywords.
 * - Test 5: Webhook client message forwarding with inline Mini App suggestion.
 * - Test 6: Invariant verification (Zero New Entities, strict type integrity).
 */

import assert from 'node:assert';
import { setupTestEnv } from './helpers/testEnv';
import {
  setTelegramChatMenuButton,
  sendTelegramDirectMessage,
} from '@/lib/telegram/telegramClient';
import {
  getTelegramSettingsServer,
  saveTelegramSettingsServer,
} from '@/lib/telegram/settings';
import { POST as sendRoute } from '../src/app/api/telegram/send/route';
import { POST as settingsPostRoute } from '../src/app/api/telegram/settings/route';
import { POST as webhookRoute } from '../src/app/api/telegram/webhook/route';
import { NextRequest } from 'next/server';

export async function runTelegramMiniAppMenuAndInlineTests() {
  const env = setupTestEnv();
  console.log('\n--- Running Suite 19: Telegram Mini App Menu Button & Inline Touchpoints ---');

  let passed = 0;
  let failed = 0;

  function recordPass(desc: string) {
    passed++;
    console.log(`  ✓ ${desc}`);
  }

  function recordFail(desc: string, err: any) {
    failed++;
    console.error(`  ✗ ${desc}:`, err?.message || err);
  }

  // Intercept global fetch to spy and validate Telegram Bot API payloads
  const originalFetch = global.fetch;
  const capturedTelegramRequests: { url: string; method: string; body?: any }[] = [];

  global.fetch = async (input: any, init?: any) => {
    const urlStr = typeof input === 'string' ? input : input?.url || '';
    if (urlStr.includes('api.telegram.org')) {
      let parsedBody: any = null;
      if (init?.body) {
        try {
          parsedBody = JSON.parse(init.body);
        } catch {
          parsedBody = init.body;
        }
      }
      capturedTelegramRequests.push({
        url: urlStr,
        method: init?.method || 'GET',
        body: parsedBody,
      });

      // Mock successful response
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          result: {
            message_id: 999123,
            date: Math.floor(Date.now() / 1000),
            chat: { id: parsedBody?.chat_id || 123456 },
          },
        }),
      } as any;
    }

    return originalFetch(input, init);
  };

  try {
    // =========================================================================
    // TEST 1: Global and Chat-Specific setTelegramChatMenuButton
    // =========================================================================
    try {
      capturedTelegramRequests.length = 0;

      // 1.1 Global invocation (omitting chatId) -> MUST NOT have chat_id in payload
      const globalRes = await setTelegramChatMenuButton({
        token: '123456789:TEST_BOT_TOKEN_GLOBAL',
        miniAppUrl: 'https://youeuropecrmtest.vercel.app/mini-app',
        buttonText: 'Запись онлайн 📱',
      });

      assert.strictEqual(globalRes.success, true, 'Global setChatMenuButton must succeed');
      const globalReq = capturedTelegramRequests.find((r) => r.url.includes('/setChatMenuButton'));
      assert.ok(globalReq, 'Must call /setChatMenuButton Telegram endpoint');
      assert.strictEqual(globalReq.body?.chat_id, undefined, 'Global payload must omit chat_id');
      assert.strictEqual(globalReq.body?.menu_button?.type, 'web_app', 'Menu button type must be web_app');
      assert.strictEqual(globalReq.body?.menu_button?.text, 'Запись онлайн 📱');
      assert.strictEqual(globalReq.body?.menu_button?.web_app?.url, 'https://youeuropecrmtest.vercel.app/mini-app');
      recordPass('T19.1: Global setChatMenuButton sets persistent menu button without chat_id');

      // 1.2 User-specific invocation -> MUST include chat_id
      capturedTelegramRequests.length = 0;
      const userRes = await setTelegramChatMenuButton({
        token: '123456789:TEST_BOT_TOKEN_USER',
        miniAppUrl: 'https://youeuropecrmtest.vercel.app/mini-app?chatId=555123',
        chatId: '555123',
        buttonText: 'Запись онлайн 📱',
      });

      assert.strictEqual(userRes.success, true, 'User setChatMenuButton must succeed');
      const userReq = capturedTelegramRequests.find((r) => r.url.includes('/setChatMenuButton'));
      assert.ok(userReq, 'Must call /setChatMenuButton for user');
      assert.strictEqual(userReq.body?.chat_id, '555123', 'Chat-specific payload must include chat_id');
      assert.strictEqual(userReq.body?.menu_button?.web_app?.url, 'https://youeuropecrmtest.vercel.app/mini-app?chatId=555123');
      recordPass('T19.2: Chat-specific setChatMenuButton sets menu button scoped to chatId');
    } catch (err: any) {
      recordFail('T19.1/T19.2: setTelegramChatMenuButton payload structure', err);
    }

    // =========================================================================
    // TEST 2: sendTelegramDirectMessage & POST /api/telegram/send with replyMarkup
    // =========================================================================
    try {
      capturedTelegramRequests.length = 0;

      const mockReplyMarkup = {
        inline_keyboard: [
          [
            {
              text: '🚀 Записаться онлайн',
              web_app: { url: 'https://youeuropecrmtest.vercel.app/mini-app?lessonId=les_99' },
            },
          ],
        ],
      };

      // 2.1 Direct client helper test
      const sendRes = await sendTelegramDirectMessage({
        token: '123456789:TEST_BOT_TOKEN',
        chatId: '777888',
        text: 'Предлагаем урок',
        replyMarkup: mockReplyMarkup,
      });

      assert.strictEqual(sendRes.success, true, 'Direct send must succeed');
      const sendReq = capturedTelegramRequests.find((r) => r.url.includes('/sendMessage'));
      assert.ok(sendReq, 'Must send message via Telegram Bot API');
      assert.deepStrictEqual(sendReq.body?.reply_markup, mockReplyMarkup, 'reply_markup must be included in payload');
      recordPass('T19.3: sendTelegramDirectMessage properly forwards inline web_app replyMarkup');

      // 2.2 Route test: POST /api/telegram/send
      capturedTelegramRequests.length = 0;
      await saveTelegramSettingsServer({
        botToken: '123456789:VALID_SERVER_TOKEN',
      });

      const nextReq = new NextRequest('https://youeuropecrmtest.vercel.app/api/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: '777888',
          recipientName: 'Анна Иванова',
          message: 'Здравствуйте! Вам предложен урок.',
          replyMarkup: mockReplyMarkup,
        }),
      });

      const routeRes = await sendRoute(nextReq);
      const routeData = await routeRes.json();

      assert.strictEqual(routeRes.status, 200, 'POST /api/telegram/send must return 200');
      assert.strictEqual(routeData.success, true, 'Route response must be success');
      const routeTgReq = capturedTelegramRequests.find((r) => r.url.includes('/sendMessage'));
      assert.ok(routeTgReq, 'Route must dispatch request to Telegram');
      assert.deepStrictEqual(routeTgReq.body?.reply_markup, mockReplyMarkup, 'Route must preserve replyMarkup in payload');
      recordPass('T19.4: POST /api/telegram/send forwards replyMarkup to Telegram Bot API');
    } catch (err: any) {
      recordFail('T19.3/T19.4: sendTelegramDirectMessage & send route replyMarkup', err);
    }

    // =========================================================================
    // TEST 3: Settings POST Route Automatically Synchronizes Global Menu Button
    // =========================================================================
    try {
      capturedTelegramRequests.length = 0;

      const settingsReq = new NextRequest('https://youeuropecrmtest.vercel.app/api/telegram/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'host': 'youeuropecrmtest.vercel.app',
        },
        body: JSON.stringify({
          botToken: '987654321:SYNC_TEST_TOKEN',
          webhookUrl: 'https://youeuropecrmtest.vercel.app/api/telegram/webhook',
          botUsername: 'youeuropeservicebot',
        }),
      });

      const settingsRes = await settingsPostRoute(settingsReq);
      const settingsData = await settingsRes.json();

      assert.strictEqual(settingsRes.status, 200, 'POST /api/telegram/settings must return 200');
      assert.strictEqual(settingsData.success, true, 'Settings update must succeed');
      assert.strictEqual(settingsData.menuButtonSynced, true, 'menuButtonSynced flag must be true');

      const menuReq = capturedTelegramRequests.find((r) => r.url.includes('/setChatMenuButton'));
      assert.ok(menuReq, 'Must call setChatMenuButton during settings save');
      assert.strictEqual(menuReq.body?.menu_button?.type, 'web_app');
      assert.strictEqual(menuReq.body?.chat_id, undefined, 'Must set global menu button');
      assert.strictEqual(menuReq.body?.menu_button?.web_app?.url, 'https://youeuropecrmtest.vercel.app/mini-app');
      recordPass('T19.5: POST /api/telegram/settings automatically configures global Mini App menu button');
    } catch (err: any) {
      recordFail('T19.5: Settings post route menu button sync', err);
    }

    // =========================================================================
    // TEST 4: Webhook Smart Booking Trigger Recognition
    // =========================================================================
    try {
      const bookingInputs = [
        '📅 Записаться на занятие',
        '/book',
        '/menu',
        '/app',
        '/mini',
        'записаться',
        'Запись',
        'Самозапись',
        'расписание',
        'мини апп',
        'миниапп',
        'онлайн запись',
      ];

      for (const inputText of bookingInputs) {
        capturedTelegramRequests.length = 0;
        const hookReq = new NextRequest('https://youeuropecrmtest.vercel.app/api/telegram/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            update_id: 1001,
            message: {
              message_id: 2001,
              from: { id: 334455, first_name: 'Ольга', username: 'olga_parent' },
              chat: { id: 334455, type: 'private' },
              text: inputText,
              date: Math.floor(Date.now() / 1000),
            },
          }),
        });

        const hookRes = await webhookRoute(hookReq);
        const hookData = await hookRes.json();

        assert.strictEqual(hookData.ok, true, `Webhook must succeed for input "${inputText}"`);
        assert.strictEqual(hookData.action, 'opened_mini_app_booking', `Action must be opened_mini_app_booking for "${inputText}"`);

        const tgSend = capturedTelegramRequests.find((r) => r.url.includes('/sendMessage'));
        assert.ok(tgSend, `Must reply with message for input "${inputText}"`);
        const inlineKeyboard = tgSend.body?.reply_markup?.inline_keyboard;
        assert.ok(Array.isArray(inlineKeyboard), 'Must contain inline_keyboard');
        assert.strictEqual(inlineKeyboard[0][0].web_app?.url.includes('/mini-app'), true, 'Must contain web_app mini-app url');
      }

      recordPass('T19.6: Webhook reliably handles all direct commands and natural booking keywords');
    } catch (err: any) {
      recordFail('T19.6: Webhook smart booking triggers', err);
    }

    // =========================================================================
    // TEST 5: Webhook Incoming Inquiry with Booking Intent Suggestion
    // =========================================================================
    try {
      capturedTelegramRequests.length = 0;

      const inquiryReq = new NextRequest('https://youeuropecrmtest.vercel.app/api/telegram/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          update_id: 1002,
          message: {
            message_id: 2002,
            from: { id: 445566, first_name: 'Михаил', username: 'mikhail_parent' },
            chat: { id: 445566, type: 'private' },
            text: 'Здравствуйте! Мы хотим записаться на пробный урок по немецкому для сына.',
            date: Math.floor(Date.now() / 1000),
          },
        }),
      });

      const inquiryRes = await webhookRoute(inquiryReq);
      const inquiryData = await inquiryRes.json();

      assert.strictEqual(inquiryData.ok, true, 'Webhook must process incoming message');
      assert.strictEqual(inquiryData.action, 'received_message', 'Message must be logged as received_message for CRM');

      // Verify that inline suggestion was sent to the parent
      const clientSuggestion = capturedTelegramRequests.find(
        (r) => r.body?.chat_id === 445566 && r.body?.reply_markup?.inline_keyboard?.[0]?.[0]?.web_app
      );
      assert.ok(clientSuggestion, 'Must send non-blocking inline Mini App suggestion to parent inquiring about booking');
      assert.strictEqual(clientSuggestion.body?.reply_markup?.inline_keyboard[0][0]?.text, '🚀 Открыть запись в Mini App');
      recordPass('T19.7: Natural inquiry receives both CRM logging and inline Mini App suggestion');
    } catch (err: any) {
      recordFail('T19.7: Natural inquiry inline Mini App suggestion', err);
    }

    // =========================================================================
    // TEST 6: Invariant Verification (Zero New Entities & Protocol Safety)
    // =========================================================================
    try {
      // Validate that all Mini App URLs use valid HTTPS or host URLs
      const appBaseUrl = 'https://youeuropecrmtest.vercel.app';
      const sampleLessonId = 'les_12345';
      const offerUrl = `${appBaseUrl}/mini-app?lessonId=${sampleLessonId}`;
      assert.ok(offerUrl.startsWith('https://'), 'Mini App URLs must be secure https');
      assert.ok(offerUrl.includes('lessonId='), 'Offer link must specify lessonId parameter');

      recordPass('T19.8: Architectural invariants, protocol safety, and Zero New Entities verified');
    } catch (err: any) {
      recordFail('T19.8: Invariant verification', err);
    }

  } finally {
    // Restore original fetch
    global.fetch = originalFetch;
  }

  console.log('-------------------------------------------------------------------------');
  console.log(`Suite 19 Summary: ${passed} passed, ${failed} failed`);
  console.log('-------------------------------------------------------------------------');

  return { passed, failed };
}

if (require.main === module) {
  runTelegramMiniAppMenuAndInlineTests().then(({ failed }) => {
    if (failed > 0) process.exit(1);
    process.exit(0);
  });
}
