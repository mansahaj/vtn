import { World, IWorldOptions, setWorldConstructor, Before, After } from "@cucumber/cucumber";
import { chromium, Browser, BrowserContext, Page } from "playwright";

const BASE_URL = "http://localhost:3000";

export class CustomWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  baseUrl: string = BASE_URL;

  /** Store arbitrary values between steps (e.g. captured KPI text) */
  stored: Record<string, string> = {};

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(CustomWorld);

Before(async function (this: CustomWorld) {
  this.browser = await chromium.launch({ headless: true });
  this.context = await this.browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  this.page = await this.context.newPage();
});

After(async function (this: CustomWorld) {
  await this.page?.close();
  await this.context?.close();
  await this.browser?.close();
});
