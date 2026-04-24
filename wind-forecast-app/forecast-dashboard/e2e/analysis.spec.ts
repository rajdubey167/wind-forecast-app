import { test, expect } from "@playwright/test";

test.describe("Analysis page (E2E)", () => {
  test("loads static analysis view and renders charts", async ({ page }) => {
    await page.goto("/analysis?source=static");

    await expect(page.locator("#analysis-content")).toBeVisible();
    await expect(page.locator("svg.recharts-surface").first()).toBeVisible();
    await expect(page.getByText(/Forecast Error Analysis/)).toBeVisible();
  });

  test("api/wind-data validates missing params", async ({ request, baseURL }) => {
    const res = await request.get(`${baseURL}/api/wind-data`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body?.error).toContain("Missing");
  });
});

