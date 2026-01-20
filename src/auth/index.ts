import type { BrowserContext, Page } from "playwright";
import type { Config } from "../types.ts";
import { authenticateWithForm } from "./form.ts";
import { authenticateWithCookie } from "./cookie.ts";
import { authenticateWithBearer } from "./bearer.ts";

export async function authenticate(
  context: BrowserContext,
  page: Page,
  config: Config
): Promise<boolean> {
  if (!config.auth) {
    return true;
  }

  switch (config.auth.type) {
    case "form":
      return await authenticateWithForm(page, config);
    case "cookie":
      return await authenticateWithCookie(context, config);
    case "bearer":
      return await authenticateWithBearer(context, config);
    default:
      throw new Error(`Unknown auth type: ${(config.auth as { type: string }).type}`);
  }
}

export { authenticateWithForm } from "./form.ts";
export { authenticateWithCookie } from "./cookie.ts";
export { authenticateWithBearer } from "./bearer.ts";
