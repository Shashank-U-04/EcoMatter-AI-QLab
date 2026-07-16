import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config: boots the FastAPI backend on :8000 (isolated e2e SQLite DB,
 * offline, short GA) and the Next dev server on :3000, then drives the real UI.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 300_000,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    permissions: ["clipboard-write", "clipboard-read"],
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      // Playwright boots web servers BEFORE globalSetup, so the fresh-DB wipe
      // must happen inside this command, before uvicorn takes the file lock.
      command:
        "del /q storage\\e2e.db* 2>nul & .venv\\Scripts\\python.exe -m uvicorn app.main:app --port 8000",
      cwd: "../backend",
      url: "http://localhost:8000/health",
      reuseExistingServer: false,
      timeout: 90_000,
      env: {
        DATABASE_URL: "sqlite:///storage/e2e.db",
        PUBCHEM_NOVELTY: "0",
        GA_GENERATIONS: "6",
        GA_TIME_BUDGET_SECONDS: "45",
        CORS_ORIGINS: "http://localhost:3000,http://127.0.0.1:3000",
      },
    },
    {
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
