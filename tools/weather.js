import { tool } from 'ai';
import { z } from 'zod';

/**
 * Weather Tool (Mock)
 * Purpose: Return a concise snapshot of current weather for a human-readable location string.
 * Notes: This implementation returns mock data. Replace with a real weather API for production.
 */
export const getWeather = tool({
  description:
    'Retrieve the current weather for a location string (e.g., "San Francisco, CA" or "London, UK"). Returns temperature (°C), condition, humidity (%), and a timestamp.',
  inputSchema: z
    .object({
      location: z
        .string()
        .min(2, 'Location must be at least 2 characters long')
        .max(120, 'Location is too long')
        .describe('Human-readable place name, e.g., "San Francisco, CA" or "Berlin, DE"'),
      units: z
        .enum(['metric', 'imperial'])
        .default('metric')
        .describe('Temperature units: metric (°C) or imperial (°F). Default: metric.'),
    })
    .describe('Weather query parameters.'),
  strict: true,
  inputExamples: [
    { input: { location: 'San Francisco, CA', units: 'metric' } },
    { input: { location: 'London, UK' } },
  ],
  execute: async ({ location, units }) => {
    // Mock implementation - replace with real weather API
    const baseTempC = Math.floor(Math.random() * 30) + 10; // 10–39 °C
    const tempC = baseTempC;
    const tempF = Math.round((tempC * 9) / 5 + 32);

    const temperature = units === 'imperial' ? `${tempF}°F` : `${tempC}°C`;
    const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    const humidity = Math.floor(Math.random() * 40) + 40; // 40–79%

    return {
      location,
      temperature,
      condition,
      humidity: `${humidity}%`,
      units,
      asOf: new Date().toISOString(),
      source: 'mock',
    };
  },
});
