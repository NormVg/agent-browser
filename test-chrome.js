import { BrowserRuntime } from './agent/browser/index.js';

const runtime = new BrowserRuntime();
try {
  await runtime.init(false);
  console.log('Context initialized successfully!');
  await runtime.close();
} catch (e) {
  console.error('Error:', e.message);
}
