import { expect, test } from '@playwright/test';

async function overflow(page: import('@playwright/test').Page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth
  }));
}

test('AC5 375 / 390 / 414 三宽度无横向溢出', async ({ page }) => {
  for (const width of [375, 390, 414]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/?source_channel=poster_cityA');
    const d = await overflow(page);
    expect(d.scrollWidth, `宽度 ${width} 出现横向溢出`).toBeLessThanOrEqual(d.innerWidth);
    await page.screenshot({ path: `evidence/shot-${width}.png`, fullPage: true });
  }
});

test('AC5 150% 系统字号（注入 24px）关键组件不溢出仍可操作', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?source_channel=poster_cityA');
  await page.addStyleTag({ content: 'html{font-size:24px !important}' });
  await expect(page.getByTestId('start-btn')).toBeVisible();
  let d = await overflow(page);
  expect(d.scrollWidth).toBeLessThanOrEqual(d.innerWidth);

  await page.getByTestId('start-btn').click();
  await expect(page.getByTestId('consent-checkbox')).toBeVisible();
  await expect(page.getByTestId('agree-start')).toBeVisible();
  d = await overflow(page);
  expect(d.scrollWidth).toBeLessThanOrEqual(d.innerWidth);
  await page.screenshot({ path: 'evidence/shot-150font.png', fullPage: true });
});
