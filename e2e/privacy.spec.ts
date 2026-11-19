import { expect, test } from '@playwright/test';
import { answerItems, startFlow } from './helpers';

test('AC4 个人信息四功能 + 撤回后清理本地缓存与会话', async ({ page }) => {
  await startFlow(page);
  await answerItems(page, 7);
  await page.goto('/privacy');

  // 1 查看（脱敏）
  await page.getByTestId('privacy-view').click();
  await expect(page.getByTestId('privacy-data')).toContainText('138****8000');
  await expect(page.getByTestId('privacy-data')).toContainText('v1.0-20261119');

  // 2 更正
  await page.getByTestId('correct-field').selectOption('area_text');
  await page.getByTestId('correct-value').fill('城市A-西区');
  await page.getByTestId('privacy-correct').click();
  await expect(page.getByTestId('correct-result')).toContainText('已更正');

  // 3 下载副本
  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('privacy-download').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('my-data.json');
  await expect(page.getByTestId('download-result')).toContainText('已生成副本');

  // 4 撤回授权并删除
  await page.getByTestId('privacy-revoke').click();
  await expect(page).toHaveURL(/revoked=1/);
  await expect(page.getByTestId('revoked-banner')).toBeVisible();
  const storage = await page.evaluate(() => ({
    ls: localStorage.length,
    ss: sessionStorage.length
  }));
  expect(storage).toEqual({ ls: 0, ss: 0 });
  await expect(page.getByText('王师傅')).toHaveCount(0);
});
