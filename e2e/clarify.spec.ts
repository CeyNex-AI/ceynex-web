/**
 * The clarification gate (backend D13): a genuinely ambiguous question gets
 * one question back, the card takes focus, and it is operable from the
 * keyboard alone.
 */

import { expect, test } from "@playwright/test";
import { answered, ask, login } from "./helpers";

test("an ambiguous question is clarified, from the keyboard, then answered", async ({ page }) => {
  await login(page);
  await ask(page, "How are tea and cinnamon exports doing?");

  // The card is the group labelled by its own question; the feedback control
  // on an answered turn is a group too, so the name matters.
  const card = page.getByRole("group", { name: /tea and cinnamon/ });
  await expect(card).toBeVisible();
  // Focus moves to the question so a screen-reader user hears it at once.
  await expect(card.locator("p[tabindex='-1']")).toBeFocused();

  // The options are disabled until the turn's `done` frame lands; Tab would
  // skip a disabled button, so wait for them to be usable first.
  const first = card.getByRole("button", { pressed: false }).first();
  await expect(first).toBeEnabled();
  await card.locator("p[tabindex='-1']").focus();
  await page.keyboard.press("Tab");
  await expect(first).toBeFocused();
  await page.keyboard.press("Space");
  await expect(card.getByRole("button", { pressed: true })).toHaveCount(1);

  // Continue, then the real turn streams and answers.
  await card.getByRole("button", { name: "Continue" }).focus();
  await page.keyboard.press("Enter");
  await answered(page);
  await expect(page.getByRole("group", { name: /tea and cinnamon/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Thought for|Show steps/ }).first()).toBeVisible();
});

test("the gate is silent on a plain question", async ({ page }) => {
  await login(page);
  await ask(page, "What is the current price trend for cinnamon?");
  await answered(page);
  await expect(page.getByRole("group", { name: /Which would you like/ })).toHaveCount(0);
});
