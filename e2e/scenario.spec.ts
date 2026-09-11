/**
 * The scenario workbench (backend D17): sliders re-run the shock in place, and
 * the parameters table says where every number came from — TBD included.
 */

import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test("moving a slider recomputes, and the sources are shown as they are", async ({ page }) => {
  await login(page);
  await page.goto("/scenario");
  await expect(page.getByRole("heading", { name: "Scenario workbench" })).toBeVisible();

  const status = page.getByRole("status");
  await expect(status).toHaveText(/Recomputed/, { timeout: 30_000 });
  const before = await page.getByText(/Revenue change/).locator("..").locator("dd").textContent();

  // Type a new depreciation; the number field mirrors the slider.
  await page.getByLabel("Depreciation, exact value").fill("10");
  await expect(status).toHaveText(/Recomputed/);
  await expect
    .poll(async () => page.getByText(/Revenue change/).locator("..").locator("dd").textContent())
    .not.toBe(before);

  // The provenance table, with the placeholders printed rather than hidden.
  const table = page.getByRole("table");
  await expect(table.getByRole("rowheader", { name: "FX pass-through" })).toBeVisible();
  await expect(table.getByText(/TBD/).first()).toBeVisible();

  // Overriding a parameter marks it, and Reset takes it back.
  await page.getByLabel("FX pass-through, exact value").fill("1");
  await expect(table.getByText("overridden")).toBeVisible();
  await page.getByRole("button", { name: "Reset FX pass-through to its default" }).click();
  await expect(table.getByText("overridden")).toHaveCount(0);

  // The agreement shock exposes the MFN rate as a parameter.
  await page.getByLabel("Loss of a trade preference").check();
  await expect(status).toHaveText(/Recomputed|Not simulated/);
  await expect(page.getByLabel("MFN tariff if the preference is lost", { exact: true })).toBeVisible();

  // The URL carries the position, so it can be shared.
  expect(page.url()).toContain("shock=agreement");
});
