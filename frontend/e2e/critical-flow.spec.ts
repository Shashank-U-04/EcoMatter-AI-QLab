import { expect, test } from "@playwright/test";

const EMAIL = `e2e-${Date.now()}@example.com`;
const PASSWORD = "e2e-password-123";
const GENERATION_TIMEOUT = 240_000;

test.describe.configure({ mode: "serial" });

test("signup → new project → generate → candidate detail → report → share", async ({ page }) => {
  // ---- Signup ----
  await page.goto("/signup");
  const formInputs = page.locator("form .input");
  await formInputs.nth(0).fill("E2E Runner"); // name
  await formInputs.nth(1).fill("QLab"); // org
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();
  await page.waitForURL("**/dashboard");

  // ---- New project wizard (presets are valid defaults) ----
  await page.goto("/projects/new");
  await page.getByRole("button", { name: /continue to targets/i }).click();
  await page.getByRole("button", { name: "Review →", exact: true }).click();
  await page.getByRole("button", { name: /launch experiment/i }).click();
  await page.waitForURL(/\/projects\/\d+/);

  // ---- Generation runs to completion; ranked table appears ----
  await expect(page.getByRole("table")).toBeVisible({ timeout: GENERATION_TIMEOUT });
  const rows = page.locator("tbody tr");
  expect(await rows.count()).toBeGreaterThan(0);

  // Fitness-evolution chart is rendered from real telemetry.
  await expect(page.getByText("Best fitness by generation")).toBeVisible();

  // ---- Candidate detail ----
  await page.getByRole("link", { name: /open/i }).first().click();
  await page.waitForURL(/\/candidates\/\d+/);
  await expect(page.getByText(/confidence/i).first()).toBeVisible();
  await expect(page.locator("main")).toContainText(/biodegradability/i);

  // ---- Back to results → JSON report downloads ----
  await page.goBack();
  await expect(page.getByRole("table")).toBeVisible({ timeout: 30_000 });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/report\.json$/);

  // ---- Share link: mint, view publicly, revoke ----
  await page.getByRole("button", { name: "Share", exact: true }).click();
  await expect(page.getByText(/link copied/i)).toBeVisible();
  const shareUrl = await page.evaluate(() => navigator.clipboard.readText());
  expect(shareUrl).toMatch(/\/share\//);

  const publicPage = await page.context().newPage();
  await publicPage.goto(shareUrl);
  await expect(publicPage.getByText(/shared results · read-only/i)).toBeVisible();
  await expect(publicPage.getByRole("table")).toBeVisible({ timeout: 30_000 });
  await publicPage.close();

  await page.getByRole("button", { name: "Unshare", exact: true }).click();
  await expect(page.getByRole("button", { name: "Share", exact: true })).toBeVisible();
});

test("reference library lists all 30 seed monomers", async ({ page }) => {
  await page.goto("/library");
  await expect(page.getByText("Seed monomers")).toBeVisible();
  await expect(page.locator("article")).toHaveCount(30, { timeout: 30_000 });
  await expect(page.getByText("Lactic acid")).toBeVisible();
});
