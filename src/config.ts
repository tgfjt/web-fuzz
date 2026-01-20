import { parse as parseYaml } from "@std/yaml";
import type { Config, CliOptions } from "./types.ts";

const DEFAULT_CONFIG: Config = {
  baseUrl: "http://localhost:3000",
  numRuns: 50,
  timeout: 5000,
  headless: true,
  paths: {
    include: ["/"],
    exclude: [],
  },
  forms: [],
  buttons: [],
  checks: {
    noServerError: true,
    formFuzzing: true,
    historyNavigation: true,
    rapidClick: true,
    queryParamFuzzing: true,
    reloadStateRestore: false,
  },
  reporter: "console",
};

export async function loadConfig(configPath: string): Promise<Config> {
  try {
    const content = await Deno.readTextFile(configPath);
    const parsed = parseYaml(content) as Partial<Config>;
    return mergeConfig(DEFAULT_CONFIG, parsed);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.warn(`Config file not found: ${configPath}, using defaults`);
      return DEFAULT_CONFIG;
    }
    throw error;
  }
}

function mergeConfig(defaults: Config, overrides: Partial<Config>): Config {
  return {
    baseUrl: overrides.baseUrl ?? defaults.baseUrl,
    numRuns: overrides.numRuns ?? defaults.numRuns,
    timeout: overrides.timeout ?? defaults.timeout,
    headless: overrides.headless ?? defaults.headless,
    auth: overrides.auth,
    paths: {
      include: overrides.paths?.include ?? defaults.paths.include,
      exclude: overrides.paths?.exclude ?? defaults.paths.exclude,
    },
    forms: overrides.forms ?? defaults.forms,
    buttons: overrides.buttons ?? defaults.buttons,
    checks: {
      ...defaults.checks,
      ...overrides.checks,
    },
    checkOptions: overrides.checkOptions,
    customChecks: overrides.customChecks,
    reporter: overrides.reporter ?? defaults.reporter,
  };
}

export function applyCliOverrides(config: Config, cli: CliOptions): Config {
  return {
    ...config,
    numRuns: cli.numRuns ?? config.numRuns,
    headless: cli.headless,
    reporter: cli.reporter ?? config.reporter,
  };
}

export function validateConfig(config: Config): string[] {
  const errors: string[] = [];

  if (!config.baseUrl) {
    errors.push("baseUrl is required");
  }

  try {
    new URL(config.baseUrl);
  } catch {
    errors.push(`Invalid baseUrl: ${config.baseUrl}`);
  }

  if (config.numRuns < 1) {
    errors.push("numRuns must be at least 1");
  }

  if (config.timeout < 0) {
    errors.push("timeout must be non-negative");
  }

  if (config.paths.include.length === 0) {
    errors.push("paths.include must have at least one path");
  }

  if (config.checks.formFuzzing && config.forms.length === 0) {
    errors.push("formFuzzing is enabled but no forms are configured");
  }

  for (const form of config.forms) {
    if (!form.path) {
      errors.push("Form path is required");
    }
    if (!form.selector) {
      errors.push("Form selector is required");
    }
    if (!form.submit) {
      errors.push("Form submit selector is required");
    }
  }

  for (const button of config.buttons) {
    if (!button.path) {
      errors.push("Button path is required");
    }
    if (!button.selector) {
      errors.push("Button selector is required");
    }
  }

  return errors;
}
