import { expect, test } from '@playwright/test';
import { answerItems, readPersisted, startFlow } from './helpers';

test('AC6 断网 10 秒恢复后会话与进度不丢、消息不重复', async ({ page, context }) => {
  await startFlow(page);
  await answerItems(page, 2);
  const before = await readPersisted(page);
  expect(before.progress.done).toBe(2);
  const sessionId = before.sessionId;

  await context.setOffline(true);
  await expect(page.getByTestId('offline-banner')).toBeVisible();

  await page.getByTestId('chat-input').fill('城市A-中心区');
  await page.getByTestId('send-btn').click();
  await page.getByTestId('chat-input').fill('全职');
  await page.getByTestId('send-btn').click();
  await expect(page.getByTestId('bubble-pending').first()).toBeVisible();

  await page.waitForTimeout(10_000);
  await context.setOffline(false);

  await expect(page.getByTestId('progress')).toContainText('报名进度 4/7', { timeout: 20_000 });
  const after = await readPersisted(page);
  expect(after.sessionId).toBe(sessionId);
  expect(after.progress.done).toBe(4);

  const userTexts = await page.locator('[data-testid="bubble"].from-user .bubble-text').allTextContents();
  expect(userTexts.filter((t) => t === '城市A-中心区')).toHaveLength(1);
  expect(userTexts.filter((t) => t === '全职')).toHaveLength(1);
  await expect(page.getByTestId('bubble-pending')).toHaveCount(0);
  await page.screenshot({ path: 'evidence/offline-after.png', fullPage: true });
});
