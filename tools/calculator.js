import { tool } from 'ai';
import { z } from 'zod';

/**
 * Calculator Tool
 * Purpose: Evaluate simple mathematical expressions and return a formatted result.
 * Safety: Avoid advanced functions. Prefer a math parser for production (e.g., mathjs or expr-eval).
 */
export const calculate = tool({
  description:
    'Evaluate a mathematical expression with +, -, *, /, parentheses, and % (mod). Returns a numeric result with optional rounding.',
  inputSchema: z
    .object({
      expression: z
        .string()
        .min(1, 'Expression cannot be empty')
        .max(200, 'Expression is too long')
        .describe('Mathematical expression like "(2 + 3) * 4 / 5" or "10 % 3".'),
      precision: z
        .number()
        .int()
        .min(0)
        .max(10)
        .optional()
        .describe('Optional number of decimal places to round the result to (0–10).'),
    })
    .describe('Calculation request.'),
  strict: true,
  inputExamples: [
    { input: { expression: '2 + 2' } },
    { input: { expression: '(12.5 - 3.2) * 2', precision: 2 } },
    { input: { expression: '10 % 3' } },
  ],
  execute: async ({ expression, precision }) => {
    try {
      // Simple sanitized evaluation; replace with a proper math parser for production.
      const sanitized = expression.replace(/[^-()\d/*+.%\s]/g, '');
      const raw = Function(`'use strict'; return (${sanitized})`)();
      const numeric = Number(raw);
      if (!Number.isFinite(numeric)) {
        throw new Error('Non-finite result');
      }
      const result = typeof precision === 'number' ? Number(numeric.toFixed(precision)) : numeric;
      return {
        expression,
        result,
        precision: typeof precision === 'number' ? precision : undefined,
      };
    } catch (error) {
      return {
        expression,
        error: 'Invalid or unsupported expression',
      };
    }
  },
});
