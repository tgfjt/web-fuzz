import type { CheckFunction } from "../types.ts";
import { resolve, dirname, fromFileUrl } from "jsr:@std/path@^1.0.0";

export async function loadCustomChecks(
  customCheckPaths: string[],
  configDir: string
): Promise<Record<string, CheckFunction>> {
  const customChecks: Record<string, CheckFunction> = {};

  for (const checkPath of customCheckPaths) {
    try {
      // Resolve relative paths from config file directory
      const absolutePath = checkPath.startsWith("/")
        ? checkPath
        : resolve(configDir, checkPath);

      // Dynamic import
      const module = await import(`file://${absolutePath}`);

      // Check for default export or named exports
      if (typeof module.default === "function") {
        // Use filename (without extension) as check name
        const checkName = absolutePath.split("/").pop()?.replace(/\.[^.]+$/, "") ?? "custom";
        customChecks[checkName] = module.default;
      } else {
        // Look for named exports that are functions
        for (const [name, value] of Object.entries(module)) {
          if (typeof value === "function" && name !== "default") {
            customChecks[name] = value as CheckFunction;
          }
        }
      }
    } catch (error) {
      console.error(`Failed to load custom check: ${checkPath}`);
      console.error(error instanceof Error ? error.message : error);
    }
  }

  return customChecks;
}
