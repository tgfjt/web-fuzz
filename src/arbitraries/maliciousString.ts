import * as fc from "fast-check";

export const maliciousStringArb = (): fc.Arbitrary<string> =>
  fc.oneof(
    // XSS patterns
    fc.constant('<script>alert(1)</script>'),
    fc.constant('"><img src=x onerror=alert(1)>'),
    fc.constant("'-alert(1)-'"),
    fc.constant('<svg onload=alert(1)>'),
    fc.constant('javascript:alert(1)'),
    fc.constant('<iframe src="javascript:alert(1)">'),
    fc.constant('{{constructor.constructor("alert(1)")()}}'),
    fc.constant('<body onload=alert(1)>'),

    // SQLi patterns
    fc.constant("' OR '1'='1"),
    fc.constant("1; DROP TABLE users;--"),
    fc.constant("' UNION SELECT * FROM users--"),
    fc.constant("1' AND '1'='1"),
    fc.constant("admin'--"),

    // Path traversal
    fc.constant("../../../etc/passwd"),
    fc.constant("..\\..\\..\\windows\\system32\\config\\sam"),
    fc.constant("%2e%2e%2f%2e%2e%2f"),

    // Command injection
    fc.constant("; ls -la"),
    fc.constant("| cat /etc/passwd"),
    fc.constant("$(whoami)"),
    fc.constant("`id`"),

    // Special characters
    fc.constant('\x00\x01\x02'),
    fc.constant('\n\r\t'),
    fc.constant('\u0000'),
    fc.constant('\uFFFE\uFFFF'),

    // Unicode edge cases
    fc.constant('𠮷野家'),  // Surrogate pairs
    fc.constant('🎉🎊🎈'),  // Emoji
    fc.constant('\u202E\u0041\u0042\u0043'), // Right-to-left override
    fc.constant('\uD800\uDC00'), // Valid surrogate pair

    // Long strings
    fc.constant('a'.repeat(1000)),
    fc.constant('a'.repeat(10000)),
    fc.constant('A'.repeat(65536)),

    // Format strings
    fc.constant('%s%s%s%s%s'),
    fc.constant('%n%n%n%n'),
    fc.constant('{0}{1}{2}'),

    // JSON/XML injection
    fc.constant('{"__proto__": {"admin": true}}'),
    fc.constant(']]><!--'),
    fc.constant('<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>'),

    // Empty and whitespace
    fc.constant(''),
    fc.constant('   '),
    fc.constant('\t\t\t'),

    // Numbers as strings
    fc.constant('0'),
    fc.constant('-1'),
    fc.constant('9999999999999999999'),
    fc.constant('1e308'),
    fc.constant('NaN'),
    fc.constant('Infinity'),

    // Boolean-like
    fc.constant('true'),
    fc.constant('false'),
    fc.constant('null'),
    fc.constant('undefined'),

    // Random strings for general fuzzing
    fc.string(),
    fc.unicodeString(),
    fc.string({ minLength: 100, maxLength: 500 })
  );
