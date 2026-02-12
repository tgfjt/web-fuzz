import type { BrowserContext } from "npm:playwright@^1.40.0";
import type { Config } from "../types.ts";

export async function authenticateWithCookie(
  context: BrowserContext,
  config: Config
): Promise<boolean> {
  const auth = config.auth;
  if (!auth || auth.type !== "cookie") {
    return false;
  }

  if (!auth.cookies || auth.cookies.length === 0) {
    throw new Error("Cookie auth requires cookies array");
  }

  const url = new URL(config.baseUrl);
  const cookies = auth.cookies.map((cookie) => ({
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain ?? url.hostname,
    path: cookie.path ?? "/",
  }));

  await context.addCookies(cookies);
  return true;
}
