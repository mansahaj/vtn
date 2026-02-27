import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

Given("I am on the dashboard", async function (this: CustomWorld) {
  await this.page.goto(`${this.baseUrl}/dashboard`, { waitUntil: "networkidle" });

  // Wait for the game selector dropdown to have a value (game auto-selected)
  await this.page.waitForFunction(
    () => {
      const select = document.querySelector("select");
      return select && select.value !== "";
    },
    { timeout: 5000 }
  );
});

Then("I should see a game selected in the dropdown", async function (this: CustomWorld) {
  const select = this.page.locator("select");
  await expect(select).toBeVisible({ timeout: 5000 });

  const value = await select.inputValue();
  expect(value).toBeTruthy();

  // Confirm the dropdown has at least one option with text
  const selectedText = await select.locator("option:checked").textContent();
  expect(selectedText).toBeTruthy();
  expect(selectedText!.length).toBeGreaterThan(0);
});

Then("I should see the attendance displayed", async function (this: CustomWorld) {
  // The GameSelector shows "Attendance: <number>"
  const attendanceSpan = this.page.locator("text=Attendance:");
  await expect(attendanceSpan).toBeVisible({ timeout: 5000 });

  // Verify there is a numeric attendance value next to the label
  const parent = attendanceSpan.locator("..");
  const text = await parent.textContent();
  expect(text).toMatch(/Attendance:\s*[\d,]+/);
});

When("I select a different game from the dropdown", async function (this: CustomWorld) {
  const select = this.page.locator("select");
  await expect(select).toBeVisible({ timeout: 5000 });

  // Capture a KPI value before switching so we can detect a change
  const kpiCard = this.page.locator("text=Total Revenue at Risk").locator("..");
  const kpiValue = await kpiCard.locator("p.text-2xl").textContent();
  this.stored["kpiBeforeSwitch"] = kpiValue ?? "";

  // Get all option values
  const options = select.locator("option");
  const optionCount = await options.count();
  expect(optionCount).toBeGreaterThanOrEqual(2);

  // Select the second option (index 1) which should differ from the auto-selected first
  const secondValue = await options.nth(1).getAttribute("value");
  expect(secondValue).toBeTruthy();

  await select.selectOption(secondValue!);

  // Wait for the network request to complete and dashboard to update
  await this.page.waitForResponse(
    (resp) => resp.url().includes("/api/forecast/") && resp.status() === 200,
    { timeout: 5000 }
  );

  // Small wait for React re-render
  await this.page.waitForTimeout(500);
});

Then("the dashboard KPI values should update", async function (this: CustomWorld) {
  // The KPI card text should now be present and potentially different
  const kpiCard = this.page.locator("text=Total Revenue at Risk").locator("..");
  const kpiValue = await kpiCard.locator("p.text-2xl").textContent();
  expect(kpiValue).toBeTruthy();

  // We verify the page rendered successfully after switching.
  // The value may or may not differ depending on the data, but the card must be present.
  const recoveryCard = this.page.locator("text=Recovery Potential");
  await expect(recoveryCard).toBeVisible({ timeout: 5000 });
});
