import type { BrowserContext } from "playwright";
import type { Config } from "../types.ts";

export async function authenticateWithBearer(
  context: BrowserContext,
  config: Config
): Promise<boolean> {
  const auth = config.auth;
  if (!auth || auth.type !== "bearer") {
    return false;
  }

  if (!auth.token) {
    throw new Error("Bearer auth requires token");
  }

  // Set Authorization header for all requests
  await context.setExtraHTTPHeaders({
    Authorization: `Bearer ${auth.token}`,
  });

  return true;
}
