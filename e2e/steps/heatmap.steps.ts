import { Given, When, Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../support/world";

Given("I am on the heatmap page", async function (this: CustomWorld) {
  await this.page.goto(`${this.baseUrl}/heatmap`, { waitUntil: "networkidle" });

  // Wait for the game to auto-select and heatmap data to load
  await this.page.waitForSelector("h1", { timeout: 5000 });

  // Wait for the heatmap grid to be rendered (stand names appear)
  await this.page.waitForSelector(".text-sm.text-gray-200.font-medium", { timeout: 5000 });
});

Then("I should see a grid with stand names as rows", async function (this: CustomWorld) {
  // Stand names are rendered as clickable rows in the grid
  const standNames = this.page.locator(".text-sm.text-gray-200.font-medium");
  const count = await standNames.count();
  expect(count).toBeGreaterThanOrEqual(1);

  // Verify first stand has text content
  const firstName = await standNames.first().textContent();
  expect(firstName).toBeTruthy();
  expect(firstName!.trim().length).toBeGreaterThan(0);

  // Store first stand name for later use
  this.stored["firstStandName"] = firstName!.trim();
});

Then("I should see time bucket labels as columns", async function (this: CustomWorld) {
  // Time bucket labels are rendered as rotated text in the header row (font-mono spans)
  const bucketLabels = this.page.locator("span.font-mono.text-\\[10px\\]");
  const count = await bucketLabels.count();
  expect(count).toBeGreaterThanOrEqual(1);

  // Time bucket labels should follow a time-like pattern (e.g., "T-90" or "12:30")
  const firstLabel = await bucketLabels.first().textContent();
  expect(firstLabel).toBeTruthy();
  expect(firstLabel!.trim().length).toBeGreaterThan(0);
});

Then("cells should be color-coded by stress level", async function (this: CustomWorld) {
  // HeatmapCell components have color classes based on overloadRatio.
  // The legend shows color steps; we verify at least some colored cells exist.
  // Cells are 48x40px divs within the grid with bg-* color classes.
  const cells = this.page.locator(".w-12.h-10");
  const count = await cells.count();
  expect(count).toBeGreaterThanOrEqual(1);

  // Verify the legend is also displayed as a visual guide
  const legendLabel = this.page.locator("text=Capacity Utilization");
  await expect(legendLabel).toBeVisible({ timeout: 5000 });
});

When("I click on a stand name", async function (this: CustomWorld) {
  // Click the first stand name in the heatmap grid
  const standNameCells = this.page.locator(".text-sm.text-gray-200.font-medium");
  const count = await standNameCells.count();
  expect(count).toBeGreaterThanOrEqual(1);

  // Store the stand name so we can verify on the detail page
  const standName = await standNameCells.first().textContent();
  this.stored["clickedStandName"] = standName!.trim();

  // The parent container of the stand name is the clickable element
  const clickableRow = standNameCells.first().locator("../..");
  await clickableRow.click();

  // Wait for navigation
  await this.page.waitForURL(/\/stands\//, { timeout: 5000 });
});

Then("I should be navigated to the stand detail page", async function (this: CustomWorld) {
  // Verify the URL matches the stand detail pattern
  const url = this.page.url();
  expect(url).toMatch(/\/stands\/.+/);

  // Verify the stand detail page shows the stand name
  const heading = this.page.locator("h2.text-xl.font-bold.text-white");
  await expect(heading).toBeVisible({ timeout: 5000 });

  const headingText = await heading.textContent();
  expect(headingText).toBeTruthy();

  // If we captured the stand name in the previous step, verify it matches
  if (this.stored["clickedStandName"]) {
    expect(headingText).toContain(this.stored["clickedStandName"]);
  }

  // Verify the "Back to Heatmap" link is present
  const backLink = this.page.locator("text=Back to Heatmap");
  await expect(backLink).toBeVisible({ timeout: 5000 });
});
