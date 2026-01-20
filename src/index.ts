import { parseCliArgs } from "./cli.ts";
import { loadConfig, applyCliOverrides, validateConfig } from "./config.ts";
import { run } from "./runner.ts";

async function main() {
  const cli = parseCliArgs(Deno.args);

  // Load config
  const rawConfig = await loadConfig(cli.config);
  const config = applyCliOverrides(rawConfig, cli);

  // Validate config
  const errors = validateConfig(config);
  if (errors.length > 0) {
    console.error("Configuration errors:");
    for (const error of errors) {
      console.error(`  - ${error}`);
    }
    Deno.exit(1);
  }

  // Run fuzzing
  const report = await run({ config, cli });

  // Exit with error code if any checks failed
  if (report.summary.failed > 0) {
    Deno.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error.message);
  Deno.exit(1);
});
