import * as fc from "fast-check";
import type { PathConfig } from "../types.ts";

const PATH_CHARS = 'abcdefghijklmnopqrstuvwxyz0123456789-_';

export function expandPaths(patterns: string[]): string[] {
  const expanded: string[] = [];

  for (const pattern of patterns) {
    if (pattern.includes('**')) {
      // For glob patterns, just add the base path
      const basePath = pattern.replace(/\/?\*\*.*$/, '') || '/';
      expanded.push(basePath);
    } else if (pattern.includes('*')) {
      // Single wildcard - add base
      const basePath = pattern.replace(/\/?\*.*$/, '') || '/';
      expanded.push(basePath);
    } else {
      expanded.push(pattern);
    }
  }

  return [...new Set(expanded)];
}

export function matchesPattern(path: string, pattern: string): boolean {
  if (pattern.includes('**')) {
    // ** matches anything including /
    const prefix = pattern.replace(/\*\*.*$/, '');
    return path.startsWith(prefix);
  } else if (pattern.includes('*')) {
    // * matches anything except /
    const regex = new RegExp(
      '^' + pattern.replace(/\*/g, '[^/]*') + '$'
    );
    return regex.test(path);
  }
  return path === pattern;
}

export function matchesAny(path: string, patterns: string[]): boolean {
  return patterns.some(pattern => matchesPattern(path, pattern));
}

export const pathArbitrary = (pathConfig: PathConfig): fc.Arbitrary<string> => {
  const expandedPaths = expandPaths(pathConfig.include);

  return fc.oneof(
    // Select from configured paths
    expandedPaths.length > 0
      ? fc.constantFrom(...expandedPaths)
      : fc.constant('/'),

    // Generate random paths
    fc.array(
      fc.stringOf(fc.constantFrom(...PATH_CHARS.split('')), { minLength: 1, maxLength: 10 }),
      { minLength: 1, maxLength: 5 }
    ).map(segments => '/' + segments.join('/')),

    // Common web paths
    fc.constantFrom(
      '/',
      '/index',
      '/home',
      '/about',
      '/contact',
      '/login',
      '/logout',
      '/register',
      '/signup',
      '/dashboard',
      '/profile',
      '/settings',
      '/admin',
      '/api',
      '/search',
      '/help',
      '/faq',
      '/privacy',
      '/terms',
      '/404',
      '/500'
    )
  ).filter(path => !matchesAny(path, pathConfig.exclude));
};

export const queryParamsArbitrary = (): fc.Arbitrary<Record<string, string>> =>
  fc.dictionary(
    fc.stringOf(fc.constantFrom(...PATH_CHARS.split('')), { minLength: 1, maxLength: 20 }),
    fc.oneof(
      fc.string(),
      fc.stringify(fc.jsonValue()),
      fc.constant(''),
      fc.constant('null'),
      fc.constant('undefined'),
      fc.constant('true'),
      fc.constant('false'),
      fc.integer().map(String),
      fc.constant('<script>alert(1)</script>'),
      fc.constant("' OR '1'='1")
    )
  );
