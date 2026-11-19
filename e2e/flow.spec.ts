import { expect, test } from '@playwright/test';
import { answerItems, startFlow } from './helpers';

test('AC1 渠道入口 → 同意 → 7 项 → 政策 → 站点 → 预约 → 结果 全流程', async ({ page }) => {
  await startFlow(page, 'poster_cityA');

  await answerItems(page, 7);
  await expect(page.getByTestId('progress')).toContainText('报名进度 7/7');

  await page.getByRole('button', { name: '政策咨询', exact: true }).click();
  await expect(page.getByTestId('policy-card')).toBeVisible();
  await expect(page.getByTestId('policy-source')).toContainText('v2.1');
  await expect(page.getByTestId('policy-card')).toContainText('政策以站点现场解释为准');

  await page.getByTestId('go-stations').click();
  await expect(page).toHaveURL(/\/stations$/);
  await expect(page.getByTestId('station-card')).toHaveCount(3);
  await page.getByTestId('slot-btn').first().click();

  await expect(page).toHaveURL(/\/booking$/);
  await page.getByTestId('confirm-booking').click();

  await expect(page).toHaveURL(/\/result$/);
  await expect(page.getByTestId('result-title')).toContainText('预约成功');
  await expect(page.getByTestId('booking-id')).toContainText('b-');
  await expect(page.getByTestId('virtual-tel')).toHaveAttribute('href', /^tel:/);
  await expect(page.getByTestId('nav-btn')).toHaveAttribute('href', /^geo:/);
});
