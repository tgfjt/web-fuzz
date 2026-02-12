import type { Page } from "npm:playwright@^1.40.0";
import type { AuthConfig, Config } from "../types.ts";

export async function authenticateWithForm(
  page: Page,
  config: Config
): Promise<boolean> {
  const auth = config.auth;
  if (!auth || auth.type !== "form") {
    return false;
  }

  if (!auth.loginUrl || !auth.credentials) {
    throw new Error("Form auth requires loginUrl and credentials");
  }

  const loginUrl = `${config.baseUrl}${auth.loginUrl}`;
  await page.goto(loginUrl, {
    timeout: config.timeout,
    waitUntil: "domcontentloaded",
  });

  // Find email/username field
  const emailField = page.locator(
    'input[type="email"], input[name="email"], input[name="username"], input[name="user"]'
  ).first();

  if (await emailField.isVisible().catch(() => false)) {
    await emailField.fill(auth.credentials.email);
  }

  // Find password field
  const passwordField = page.locator('input[type="password"]').first();
  if (await passwordField.isVisible().catch(() => false)) {
    await passwordField.fill(auth.credentials.password);
  }

  // Find and click submit button
  const submitButton = page.locator(
    'button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in"), button:has-text("ログイン")'
  ).first();

  if (await submitButton.isVisible().catch(() => false)) {
    await submitButton.click();
  }

  // Wait for navigation
  await page.waitForLoadState("domcontentloaded");

  // Check if we're still on login page (auth might have failed)
  const currentUrl = page.url();
  if (currentUrl.includes(auth.loginUrl)) {
    console.warn("Warning: Still on login page after authentication attempt");
    return false;
  }

  return true;
}
