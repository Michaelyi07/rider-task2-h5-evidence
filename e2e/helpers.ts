import { expect, type Page } from '@playwright/test';

export const ANSWERS = ['王师傅', '1995-06', '城市A-中心区', '全职', '有', '本周内', '有 1 年'];

export async function startFlow(page: Page, channel = 'poster_cityA') {
  await page.goto(`/?source_channel=${channel}`);
  await expect(page.getByTestId('source-channel')).toHaveText(channel);
  await page.getByTestId('start-btn').click();
  await expect(page).toHaveURL(/\/consent$/);
  await page.getByTestId('consent-checkbox').check();
  await page.getByTestId('agree-start').click();
  await expect(page).toHaveURL(/\/chat$/);
}

export async function answerItems(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    await page.getByRole('button', { name: ANSWERS[i], exact: true }).click();
    await expect(page.getByTestId('progress')).toContainText(`报名进度 ${i + 1}/7`);
  }
}

export async function readPersisted(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('clawhunt:session:v1') || '{}'));
}
