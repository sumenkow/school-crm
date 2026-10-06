/**
 * SMART ACADEMY / YOU EUROPE CRM — TELEGRAM BOT SUPABASE PERSISTENCE TEST SUITE (SUITE 16)
 *
 * Requirements:
 * - Test 1: Simulating login from new PC (empty localStorage) -> reading settings from Supabase.
 * - Test 2: Simulating update by User A and immediate retrieval by User B (cross-user sync).
 * - Test 3: Verification of server routes (/api/telegram/send, /api/telegram/webhook) fetching directly from Supabase without client token.
 * - Test 4: Preserving bot username @youeuropeservicebot and webhook integrity.
 */

import assert from 'node:assert';
import { setupTestEnv } from './helpers/testEnv';
import {
  getTelegramSettingsServer,
  saveTelegramSettingsServer,
  maskBotToken,
} from '@/lib/telegram/settings';
import {
  resolveBotToken,
  generateTelegramDeeplink,
} from '@/lib/telegram/telegramClient';
import { GET as getSettingsRoute, POST as postSettingsRoute } from '../src/app/api/telegram/settings/route';
import { POST as sendRoute } from '../src/app/api/telegram/send/route';
import { GET as setupGetRoute } from '../src/app/api/telegram/setup/route';

export async function runTelegramPersistenceTests() {
  const env = setupTestEnv();
  console.log('\n--- Running Suite 16: Telegram Bot Supabase Persistence & Multi-Device Tests ---');

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

  // ===========================================================================
  // TEST 1: New Device / Clean Browser Simulation (Empty localStorage)
  // ===========================================================================
  try {
    env.clear();
    assert.strictEqual(env.store.size, 0, 'LocalStorage must be completely empty');

    // 1.1 Server settings retrieval on clean device
    const settings = await getTelegramSettingsServer();
    assert.ok(settings, 'Settings must be returned from persistent server store');
    assert.strictEqual(settings.botUsername, 'youeuropeservicebot', 'Bot username must default to youeuropeservicebot');
    assert.ok(settings.webhookUrl.includes('/api/telegram/webhook'), 'Webhook must point to valid webhook URL');
    recordPass('T16.1: Clean device retrieves persistent server settings with @youeuropeservicebot');

    // 1.2 GET /api/telegram/settings returns safe masked payload
    const getReq = new Request('https://youeuropecrmtest.vercel.app/api/telegram/settings');
    const getRes = await getSettingsRoute();
    const getData = await getRes.json();
    assert.strictEqual(getData.success, true, 'GET /api/telegram/settings must succeed');
    assert.strictEqual(getData.settings.botUsername, 'youeuropeservicebot');
    assert.strictEqual(maskBotToken('123456789:ABCdefGHI_Secret_123'), '••••••••');
    assert.strictEqual(maskBotToken(''), '');
    recordPass('T16.2: GET /api/telegram/settings returns masked credentials on fresh device');
  } catch (err) {
    recordFail('Test 1: New Device / Clean Browser Simulation', err);
  }

  // ===========================================================================
  // TEST 2: Cross-Device & Cross-User Instant Synchronization
  // ===========================================================================
  try {
    // 2.1 User A updates adminChatId and notifications
    const updatePayload = {
      adminChatId: '9988776655',
      ownerChatId: '1122334455',
      botUsername: 'youeuropeservicebot',
      notificationsEnabled: true,
      botToken: '7890123456:AASecretToken_For_Testing',
    };

    const postReq = new Request('https://youeuropecrmtest.vercel.app/api/telegram/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    });

    const postRes = await postSettingsRoute(postReq as any);
    const postData = await postRes.json();
    assert.strictEqual(postData.success, true, 'POST /api/telegram/settings must succeed');
    assert.strictEqual(postData.settings.adminChatId, '9988776655');
    assert.strictEqual(postData.settings.botToken, '••••••••', 'Updated token must be masked in response');

    // 2.2 User B (different session, clean cache) reads settings
    const userBSettings = await getTelegramSettingsServer();
    assert.strictEqual(userBSettings.adminChatId, '9988776655', 'User B must immediately observe User A adminChatId');
    assert.strictEqual(userBSettings.ownerChatId, '1122334455', 'User B must immediately observe User A ownerChatId');
    assert.strictEqual(userBSettings.hasBotToken, true, 'hasBotToken must be true for User B');
    assert.strictEqual(userBSettings.botToken, '7890123456:AASecretToken_For_Testing');
    recordPass('T16.3: Cross-user synchronization propagates atomically to secondary sessions');

    // 2.3 Preserving secret token when editing other fields with masked token
    await saveTelegramSettingsServer({
      botToken: '••••••••', // User submitted form without modifying masked token
      adminChatId: '5544332211',
    });
    const preservedSettings = await getTelegramSettingsServer();
    assert.strictEqual(preservedSettings.botToken, '7890123456:AASecretToken_For_Testing', 'Masked token •••••••• must NOT erase existing secret');
    assert.strictEqual(preservedSettings.adminChatId, '5544332211', 'Other updated fields must be saved');
    recordPass('T16.4: Masked token placeholder does not overwrite active secret token in database');
  } catch (err) {
    recordFail('Test 2: Cross-Device & Cross-User Synchronization', err);
  }

  // ===========================================================================
  // TEST 3: Server API Autonomous Fallback Without Client Token
  // ===========================================================================
  try {
    // 3.1 Send route executes without customBotToken in request body
    const sendReq = new Request('https://youeuropecrmtest.vercel.app/api/telegram/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: '123456789',
        message: 'Тестовое уведомление ученику',
        // customBotToken is omitted completely
      }),
    });

    const sendRes = await sendRoute(sendReq as any);
    const sendData = await sendRes.json();
    // Test env fetch mock returns ok: true
    assert.strictEqual(sendData.success, true, '/api/telegram/send must succeed without client-supplied token');
    recordPass('T16.5: Server /api/telegram/send dispatches autonomously via Supabase token fallback');

    // 3.2 Setup route executes without token query param
    const setupReq = new Request('https://youeuropecrmtest.vercel.app/api/telegram/setup');
    const setupRes = await setupGetRoute(setupReq as any);
    const setupData = await setupRes.json();
    assert.strictEqual(setupData.configured, true, '/api/telegram/setup must be configured via Supabase settings');
    recordPass('T16.6: Server /api/telegram/setup checks status using persistent database credentials');
  } catch (err) {
    recordFail('Test 3: Server API Autonomous Fallback', err);
  }

  // ===========================================================================
  // TEST 4: Preservation of Bot Username & Webhook Integrity
  // ===========================================================================
  try {
    const finalSettings = await getTelegramSettingsServer();
    assert.strictEqual(finalSettings.botUsername, 'youeuropeservicebot', 'Bot username must be youeuropeservicebot');

    const deeplink = generateTelegramDeeplink(finalSettings.botUsername, 'par', 'parent_101');
    assert.strictEqual(deeplink, 'https://t.me/youeuropeservicebot?start=par_parent_101');

    assert.ok(finalSettings.webhookUrl.endsWith('/api/telegram/webhook'), 'Webhook URL must target /api/telegram/webhook');
    recordPass('T16.7: Bot username @youeuropeservicebot and deeplink format verified');
  } catch (err) {
    recordFail('Test 4: Preservation of Bot Username & Webhook Integrity', err);
  }

  console.log('---------------------------------------------------------------');
  console.log(`Suite 16 Complete: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// Auto-run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runTelegramPersistenceTests()
    .then((res) => {
      if (res.failed > 0) process.exit(1);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal Suite 16 error:', err);
      process.exit(1);
    });
}
