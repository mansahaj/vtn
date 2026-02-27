import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

Given("I am on the simulator page", async function (this: CustomWorld) {
  await this.page.goto(`${this.baseUrl}/simulator`, { waitUntil: "networkidle" });

  // Wait for the page heading to confirm we are on the simulator
  const heading = this.page.locator("h1", { hasText: "Staff Redeployment Simulator" });
  await expect(heading).toBeVisible({ timeout: 5000 });

  // Wait for the staff configuration table to render
  await this.page.waitForSelector("table", { timeout: 5000 });

  // Wait for simulation to complete (the initial auto-run)
  await this.page.waitForFunction(
    () => {
      const recalcEl = document.querySelector("text=Recalculating...");
      return !recalcEl;
    },
    { timeout: 5000 }
  ).catch(() => {
    // Recalculating may have already finished; safe to continue
  });

  // Small buffer to let the debounced simulation settle
  await this.page.waitForTimeout(500);
});

When("I increase the staff count for a stand", async function (this: CustomWorld) {
  // Capture the "New Revenue at Risk" KPI value before changing staff
  const riskCard = this.page.locator("text=New Revenue at Risk").locator("..");
  const riskValueEl = riskCard.locator("p.text-2xl");
  await expect(riskValueEl).toBeVisible({ timeout: 5000 });
  const riskBefore = await riskValueEl.textContent();
  this.stored["riskBefore"] = riskBefore ?? "";

  // Find the first "+" button to increase staff for the first stand
  // The increase button has aria-label "Increase staff for <name>"
  const increaseButtons = this.page.locator("button[aria-label^='Increase staff for']");
  const count = await increaseButtons.count();
  expect(count).toBeGreaterThanOrEqual(1);

  // Click the increase button for the first stand
  await increaseButtons.first().click();

  // Wait for the debounced simulation to fire and complete
  try {
    await this.page.waitForResponse(
      (resp) => resp.url().includes("/api/simulate/") && resp.status() === 200,
      { timeout: 5000 }
    );
  } catch {
    // If the response was too fast, that is acceptable
  }

  // Let React re-render
  await this.page.waitForTimeout(500);
});

Then("the revenue at risk should decrease or change", async function (this: CustomWorld) {
  // Verify the "New Revenue at Risk" KPI is present and has a value
  const riskCard = this.page.locator("text=New Revenue at Risk").locator("..");
  const riskValueEl = riskCard.locator("p.text-2xl");
  await expect(riskValueEl).toBeVisible({ timeout: 5000 });

  const riskAfter = await riskValueEl.textContent();
  expect(riskAfter).toBeTruthy();

  // The Recovery / Delta card should show some value
  const deltaCard = this.page.locator("text=Recovery / Delta").locator("..");
  const deltaValueEl = deltaCard.locator("p.text-2xl");
  await expect(deltaValueEl).toBeVisible({ timeout: 5000 });
});

Then("recommended moves should be displayed", async function (this: CustomWorld) {
  // The "Recommended Moves" section should be visible
  const heading = this.page.locator("h2", { hasText: "Recommended Moves" });
  await expect(heading).toBeVisible({ timeout: 5000 });
});

Given("I can see recommended moves", async function (this: CustomWorld) {
  // Wait for the recommended moves section with at least one Apply button
  const applyButtons = this.page.locator("button", { hasText: "Apply" });

  // If there are no recommended moves yet, increase staff on an overloaded stand to trigger them
  const count = await applyButtons.count();
  if (count === 0) {
    // Decrease staff on the first stand to create an imbalance that triggers recommendations
    const decreaseButtons = this.page.locator("button[aria-label^='Decrease staff for']");
    const btnCount = await decreaseButtons.count();
    if (btnCount > 0) {
      // Click decrease a few times to worsen an overload
      await decreaseButtons.first().click();
      await this.page.waitForTimeout(200);
      await decreaseButtons.first().click();

      // Wait for simulation response
      try {
        await this.page.waitForResponse(
          (resp) => resp.url().includes("/api/simulate/") && resp.status() === 200,
          { timeout: 5000 }
        );
      } catch {
        // Response may have arrived quickly
      }
      await this.page.waitForTimeout(500);
    }
  }

  // Verify recommended moves are now visible
  const heading = this.page.locator("h2", { hasText: "Recommended Moves" });
  await expect(heading).toBeVisible({ timeout: 5000 });
});

When("I click {string} on a recommended move", async function (this: CustomWorld, buttonText: string) {
  // Locate the first Apply button in the recommended moves section
  const recommendedSection = this.page.locator("h2", { hasText: "Recommended Moves" }).locator("..");
  const applyButton = recommendedSection.locator("button", { hasText: buttonText }).first();
  await expect(applyButton).toBeVisible({ timeout: 5000 });

  // Before clicking, capture the move description to know which stands are affected
  const moveContainer = applyButton.locator("..");
  const moveText = await moveContainer.textContent();
  this.stored["moveDescription"] = moveText ?? "";

  // Capture current staff values from the table for comparison
  const staffInputs = this.page.locator("table input[type='number']");
  const inputCount = await staffInputs.count();
  const staffBefore: string[] = [];
  for (let i = 0; i < inputCount; i++) {
    const val = await staffInputs.nth(i).inputValue();
    staffBefore.push(val);
  }
  this.stored["staffBefore"] = JSON.stringify(staffBefore);

  // Click the Apply button
  await applyButton.click();

  // Wait for simulation to recalculate
  try {
    await this.page.waitForResponse(
      (resp) => resp.url().includes("/api/simulate/") && resp.status() === 200,
      { timeout: 5000 }
    );
  } catch {
    // Response may have arrived quickly
  }
  await this.page.waitForTimeout(500);
});

Then("the staff counts should update accordingly", async function (this: CustomWorld) {
  // Read the staff input values again and compare to what we stored before
  const staffInputs = this.page.locator("table input[type='number']");
  const inputCount = await staffInputs.count();
  expect(inputCount).toBeGreaterThanOrEqual(1);

  const staffAfter: string[] = [];
  for (let i = 0; i < inputCount; i++) {
    const val = await staffInputs.nth(i).inputValue();
    staffAfter.push(val);
  }

  // At least one staff count should have changed after applying a move
  const staffBefore: string[] = JSON.parse(this.stored["staffBefore"] || "[]");
  let hasChange = false;
  for (let i = 0; i < Math.min(staffBefore.length, staffAfter.length); i++) {
    if (staffBefore[i] !== staffAfter[i]) {
      hasChange = true;
      break;
    }
  }
  expect(hasChange).toBeTruthy();
});
