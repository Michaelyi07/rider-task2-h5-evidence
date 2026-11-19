import { expect, test } from '@playwright/test';

test('AC2 未勾选不能开始；同意版本与 UTC 时间戳按契约回传', async ({ page }) => {
  await page.goto('/?source_channel=poster_cityA');
  await page.getByTestId('start-btn').click();
  await expect(page.getByTestId('agree-start')).toBeDisabled();

  const consentRequest = page.waitForRequest(
    (req) => req.method() === 'POST' && req.url().endsWith('/api/v1/consent')
  );
  await page.getByTestId('consent-checkbox').check();
  await expect(page.getByTestId('agree-start')).toBeEnabled();
  await page.getByTestId('agree-start').click();

  const req = await consentRequest;
  const body = req.postDataJSON();
  expect(body.consent_version).toBe('v1.0-20261119');
  expect(body.consent_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  expect(body.source_channel).toBe('poster_cityA');
  await expect(page).toHaveURL(/\/chat$/);
});

test('AC2 不同意可退出且不发任何同意请求', async ({ page }) => {
  let consentCalled = false;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/v1/consent')) consentCalled = true;
  });
  await page.goto('/consent');
  await page.getByTestId('decline-btn').click();
  await expect(page).toHaveURL(/\/decline$/);
  await expect(page.getByRole('link', { name: /电话咨询报名/ })).toBeVisible();
  expect(consentCalled).toBe(false);
});
