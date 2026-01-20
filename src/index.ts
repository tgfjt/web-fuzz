import { parseCliArgs } from "./cli.ts";
import { loadConfig, applyCliOverrides, validateConfig } from "./config.ts";
import { run } from "./runner.ts";
import { CONFIG_TEMPLATE } from "./templates/config.yaml.ts";

async function initConfig(configPath: string): Promise<void> {
  try {
    await Deno.stat(configPath);
    console.error(`Error: ${configPath} already exists`);
    Deno.exit(1);
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) {
      throw error;
    }
  }

  await Deno.writeTextFile(configPath, CONFIG_TEMPLATE);
  console.log(`Created ${configPath}`);
  console.log("Edit this file to configure web-fuzz for your project.");
}

async function main() {
  const cli = parseCliArgs(Deno.args);

  // Handle --init
  if (cli.init) {
    await initConfig(cli.config);
    return;
  }

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
