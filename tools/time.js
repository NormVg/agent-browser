import { tool } from 'ai';
import { z } from 'zod';

/**
 * Time Tool
 * Purpose: Return the current date/time in ISO and localized human formats. Optionally specify an IANA timezone.
 */
export const getCurrentTime = tool({
  description:
    'Get the current date/time. Optionally specify an IANA timezone (e.g., "America/New_York", "Europe/London"). Returns ISO string, localized string, and timezone used.',
  inputSchema: z
    .object({
      timezone: z
        .string()
        .optional()
        .describe('Optional IANA timezone (e.g., "America/New_York"). Defaults to local timezone.'),
      locale: z
        .string()
        .optional()
        .describe('BCP 47 locale for formatting (e.g., "en-US", "de-DE"). Defaults to "en-US".'),
      includeWeekday: z
        .boolean()
        .optional()
        .describe('If true, include the weekday name in the human-readable output.'),
    })
    .describe('Time query parameters.'),
  strict: true,
  inputExamples: [
    { input: { } },
    { input: { timezone: 'America/New_York' } },
    { input: { timezone: 'Europe/London', locale: 'en-GB', includeWeekday: true } },
  ],
  execute: async ({ timezone, locale = 'en-US', includeWeekday }) => {
    const now = new Date();
    const options = {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    };
    if (includeWeekday) options.weekday = 'short';

    // Try to format with timezone if provided
    let tzUsed = 'local';
    let human;
    try {
      const fmt = new Intl.DateTimeFormat(locale, {
        ...options,
        ...(timezone ? { timeZone: timezone } : {}),
      });
      human = fmt.format(now);
      if (timezone) tzUsed = timezone;
    } catch (e) {
      // Fallback to local formatting if timezone invalid
      human = new Intl.DateTimeFormat(locale, options).format(now);
      tzUsed = 'local';
    }

    return {
      iso: now.toISOString(),
      human,
      timezone: tzUsed,
      locale,
    };
  },
});
