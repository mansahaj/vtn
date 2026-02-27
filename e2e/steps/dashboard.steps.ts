import { Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

Then("I should see {string} KPI card", async function (this: CustomWorld, label: string) {
  // KPI cards render the label as an uppercase <p> element
  const card = this.page.locator(`text=${label}`);
  await expect(card).toBeVisible({ timeout: 5000 });

  // The card should also display a value (the bold <p> element with a dollar amount or text)
  const cardContainer = card.locator("..");
  const valueEl = cardContainer.locator("p.text-2xl");
  await expect(valueEl).toBeVisible({ timeout: 5000 });
  const value = await valueEl.textContent();
  expect(value).toBeTruthy();
  expect(value!.length).toBeGreaterThan(0);
});

Then("I should see the top 3 bottleneck stands", async function (this: CustomWorld) {
  const heading = this.page.locator("h2", { hasText: "Top 3 Bottleneck Stands" });
  await expect(heading).toBeVisible({ timeout: 5000 });

  // The section should contain up to 3 stand entries with dollar amounts
  const section = heading.locator("..");
  const standRows = section.locator(".bg-gray-800");
  const count = await standRows.count();
  expect(count).toBeGreaterThanOrEqual(1);
  expect(count).toBeLessThanOrEqual(3);

  // Each row should show a stand name and a revenue-at-risk value
  for (let i = 0; i < count; i++) {
    const row = standRows.nth(i);
    const rowText = await row.textContent();
    expect(rowText).toBeTruthy();
    // Should contain a dollar sign for revenue
    expect(rowText).toContain("$");
  }
});

Then("I should see the top 3 stress windows", async function (this: CustomWorld) {
  const heading = this.page.locator("h2", { hasText: "Top 3 Stress Windows" });
  await expect(heading).toBeVisible({ timeout: 5000 });

  const section = heading.locator("..");
  const windowRows = section.locator(".bg-gray-800");
  const count = await windowRows.count();
  expect(count).toBeGreaterThanOrEqual(1);
  expect(count).toBeLessThanOrEqual(3);

  // Each row should show a time bucket and an overload value
  for (let i = 0; i < count; i++) {
    const row = windowRows.nth(i);
    const rowText = await row.textContent();
    expect(rowText).toBeTruthy();
    expect(rowText).toContain("overload");
  }
});

Then("I should see the assumptions section", async function (this: CustomWorld) {
  const heading = this.page.locator("h2", { hasText: "Assumptions" });
  await expect(heading).toBeVisible({ timeout: 5000 });

  // The assumptions section should contain a <ul> with at least one <li>
  const section = heading.locator("..");
  const items = section.locator("li");
  const count = await items.count();
  expect(count).toBeGreaterThanOrEqual(1);

  // Each assumption should have some text content
  const firstItemText = await items.first().textContent();
  expect(firstItemText!.trim().length).toBeGreaterThan(0);
});
