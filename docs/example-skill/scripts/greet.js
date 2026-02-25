#!/usr/bin/env node

/**
 * Greet Script
 * A simple script that generates a greeting message.
 *
 * Usage: node greet.js [name]
 * Default name: "World"
 */

const name = process.argv[2] || 'World';
const timestamp = new Date().toLocaleString();

console.log(JSON.stringify({
  message: `Hello, ${name}!`,
  timestamp: timestamp,
  skill: 'example-skill'
}, null, 2));
