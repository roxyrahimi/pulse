import { chromium, defineConfig, devices } from "@playwright/test";

const cdpUrl = process.env.PLAYWRIGHT_CDP_URL;
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// When a remote CDP URL is provided (e.g. Kernel cloud browser),
// patch chromium.connect to use connectOverCDP which speaks Chrome
// DevTools Protocol instead of Playwright's wire protocol.
if (cdpUrl) {
  const connectOverCDP = chromium.connectOverCDP.bind(chromium);
  (chromium as any).launch = async () => connectOverCDP(cdpUrl);
  (chromium as any).connect = async () => connectOverCDP(cdpUrl);
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: 1,
  workers: 1,
  reporter: [["json", { outputFile: "e2e-results.json" }]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...(cdpUrl ? { connectOptions: { wsEndpoint: cdpUrl } } : {}),
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
