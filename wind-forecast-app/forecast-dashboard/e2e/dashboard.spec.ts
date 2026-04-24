import { test, expect } from "@playwright/test";
import windData from "./fixtures/wind-data.json";

type E2EWindow = Window & {
  __E2E?: boolean;
  __lastCsvDownload?: string;
};

test.describe("Dashboard (E2E)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      (window as E2EWindow).__E2E = true;
    });

    // Mock live API to be deterministic and fast.
    await page.route("**/api/wind-data**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(windData),
      });
    });

    // Also mock the static dataset fetch to keep tests snappy and stable.
    await page.route("**/data/processed_wind_data.json", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(windData),
      });
    });
  });

  test("loads static by default and renders chart + KPIs", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("source-static")).toBeVisible();
    await expect(page.getByTestId("source-live")).toBeVisible();

    // Chart surface should exist (recharts renders SVG).
    await expect(page.locator("svg.recharts-surface").first()).toBeVisible();

    // KPI cards should exist (at least one number with MW).
    await expect(page.getByText(/MW/).first()).toBeVisible();
  });

  test("switches to live and shows live badge", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("source-live").click();

    // Live-only controls should appear when live mode is active.
    await expect(page.getByText(/Auto Off|Auto On/)).toBeVisible();
    await expect(page.locator("svg.recharts-surface").first()).toBeVisible();
  });

  test("switches live -> static without losing chart data", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("source-live").click();
    await expect(page.getByText(/Auto Off|Auto On/)).toBeVisible();

    await page.getByTestId("source-static").click();
    await expect(page.getByText(/Auto Off|Auto On/)).toHaveCount(0);
    await expect(page.locator("svg.recharts-surface").first()).toBeVisible();
  });

  test("shows deviation alert when threshold is low", async ({ page }) => {
    await page.goto("/");

    // Set threshold to 0 so any non-zero deviation triggers alert.
    const input = page.locator('input[type="number"]').first();
    await input.fill("0");

    await expect(page.getByText(/High Deviation Alert:/)).toBeVisible();
  });

  test("CSV export produces a non-empty CSV string", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("download-csv").click();

    const csv = await page.evaluate(() => (window as E2EWindow).__lastCsvDownload);
    expect(csv).toBeTruthy();
    expect(csv!.split("\n").length).toBeGreaterThan(2);
    expect(csv!).toMatch(/^time,actual,forecast/);
  });
});

