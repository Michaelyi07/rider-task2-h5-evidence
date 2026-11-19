import { expect, test } from '@playwright/test';

const ROUTES = ['/entry', '/consent', '/chat', '/stations', '/booking', '/result'];

test('AC3 AI 身份标识每一屏可见（六路由参数化）', async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route);
    const badge = page.getByTestId('ai-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('本服务由 AI 提供 · 可随时转人工');
  }
});
