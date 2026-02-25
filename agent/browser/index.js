import { chromium } from 'playwright';
import os from 'os';
import path from 'path';

// User Data Directory (Playwright automatically uses the 'Default' profile inside)
const CHROME_PROFILE = path.join(os.homedir(), 'Library/Application Support/Google/Chrome');

// Args to suppress Chrome startup dialogs that block Playwright
const SHARED_ARGS = [
  '--no-sandbox',
  '--disable-blink-features=AutomationControlled',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-session-crashed-bubble',
  '--disable-infobars',
  '--disable-features=TranslateUI',
];

export class BrowserRuntime {
  constructor() {
    this.browser = null;  // Browser object (sandbox/cdp) or null (owned)
    this.context = null;  // BrowserContext
    this.page = null;  // Active page
    this.mode = null;  // 'cdp' | 'owned' | 'sandbox'
    this.agentPage = null;  // The tab WE opened — the only thing we close
  }

  /**
   * Init strategy (in priority order):
   * 1. CDP    — Chrome already running on :9222 (safest, instant, all accounts)
   * 2. Owned  — launch Chrome from real profile, open one new tab
   * 3. Sandbox — fresh blank profile (no logins, but safe)
   *
   * ⚠️ We NEVER call context.close() on the real profile — that wipes cookies/sessions.
   */
  async init(headless = true) {
    if (this.page) return;

    // ── 1. CDP ──────────────────────────────────────────────────────
    try {
      this.browser = await chromium.connectOverCDP('http://localhost:9222');
      this.context = this.browser.contexts()[0];
      this.agentPage = await this.context.newPage();
      this.page = this.agentPage;
      this.mode = 'cdp';
      this.page.setDefaultTimeout(30000);
      console.log('[Browser] Connected via CDP ✓ (all your accounts available)');
      return;
    } catch (_) { /* Chrome not on :9222 */ }

    // ── 2. Owned (real profile) ──────────────────────────────────────
    try {
      const ctx = await chromium.launchPersistentContext(CHROME_PROFILE, {
        headless,
        channel: 'chrome',
        args: [...SHARED_ARGS, '--remote-debugging-port=9222'], // next run can use CDP
        viewport: { width: 1280, height: 800 },
        timeout: 10000, // fail fast if a dialog blocks launch
      });
      this.browser = null;  // no Browser object — launchPersistentContext returns a Context
      this.context = ctx;
      this.agentPage = await ctx.newPage();
      this.page = this.agentPage;
      this.mode = 'owned';
      this.page.setDefaultTimeout(30000);
      console.log('[Browser] Launched Chrome with your real profile ✓');
      return;
    } catch (e) {
      const locked = e.message.includes('lock') || e.message.includes('LOCK') || e.message.includes('already running');
      if (!locked) throw e;
      console.warn('[Browser] Profile locked (Chrome is open). Using sandbox — close Chrome first for account access.');
    }

    // ── 3. Sandbox (fallback) ─────────────────────────────────────────
    this.browser = await chromium.launch({ headless, channel: 'chrome', args: SHARED_ARGS });
    this.context = await this.browser.newContext({ viewport: { width: 1280, height: 800 } });
    this.agentPage = await this.context.newPage();
    this.page = this.agentPage;
    this.mode = 'sandbox';
    this.page.setDefaultTimeout(30000);
    console.log('[Browser] Sandbox mode (no logins). Run Chrome with --remote-debugging-port=9222 for account access.');
  }

  /**
   * Close ONLY the tab we opened.
   * In sandbox mode: also kills the throwaway browser.
   * In owned/cdp mode: NEVER touch the context or browser — profile stays intact.
   */
  async close() {
    try {
      await this.agentPage?.close().catch(() => { });
      if (this.mode === 'sandbox') {
        await this.context?.close().catch(() => { });
        await this.browser?.close().catch(() => { });
      }
      // owned/cdp: Chrome stays running with all sessions intact ✓
    } catch (_) { }
    this.browser = null;
    this.context = null;
    this.page = null;
    this.agentPage = null;
    this.mode = null;
  }

  // ------------- ACTION LAYER -------------

  async navigate(url) {
    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.page.waitForTimeout(1500);
    } catch (e) {
      console.warn(`[Browser] Navigation timed out for ${url}, continuing with partial page.`);
    }
  }

  async click(elementId) {
    try {
      const locator = this.page.locator(`[data-agent-id="${elementId}"]`);
      await locator.scrollIntoViewIfNeeded();
      await locator.click({ timeout: 10000 });
    } catch (e) {
      throw new Error(`Failed to click element ${elementId}: ${e.message}`);
    }
  }

  async type(elementId, text) {
    try {
      const locator = this.page.locator(`[data-agent-id="${elementId}"]`);
      await locator.scrollIntoViewIfNeeded();
      await locator.fill(text);
    } catch (e) {
      throw new Error(`Failed to type into element ${elementId}: ${e.message}`);
    }
  }

  async pressEnter() {
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1500);
  }

  async scroll(direction) {
    if (direction === 'down') {
      await this.page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.8));
    } else {
      await this.page.evaluate(() => window.scrollBy(0, -window.innerHeight * 0.8));
    }
    await this.page.waitForTimeout(500);
  }

  async wait(ms) {
    await this.page.waitForTimeout(ms);
  }

  // ------------- PERCEPTION LAYER -------------

  /**
   * Extracts a simplified DOM snapshot — injects data-agent-id on interactable elements.
   */
  async observeState() {
    if (!this.page) throw new Error('Browser not initialized.');

    try {
      await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    } catch (_) { }

    const state = await this.page.evaluate(() => {
      let idCounter = 1;
      const elements = [];
      const interactableTags = ['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT'];

      const walker = document.createTreeWalker(
        document.body || document.documentElement,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode(node) {
            const style = window.getComputedStyle(node);
            if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) {
              return NodeFilter.FILTER_REJECT;
            }
            if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      let currentNode = walker.currentNode;
      while (currentNode) {
        let isInteractable = interactableTags.includes(currentNode.tagName);

        if (!isInteractable) {
          const role = currentNode.getAttribute('role');
          if (['button', 'link', 'menuitem', 'option', 'combobox', 'searchbox'].includes(role)) {
            isInteractable = true;
          } else if (currentNode.onclick || currentNode.getAttribute('tabindex') === '0') {
            isInteractable = true;
          }
        }

        const isHeading = ['H1', 'H2', 'H3'].includes(currentNode.tagName);

        if (isInteractable || isHeading) {
          const rect = currentNode.getBoundingClientRect();
          const inViewport = rect.width > 0 && rect.height > 0 &&
            rect.top >= -100 && rect.bottom <= (window.innerHeight + 100);

          currentNode.setAttribute('data-agent-id', idCounter.toString());

          const text = (
            currentNode.innerText ||
            currentNode.getAttribute('placeholder') ||
            currentNode.value ||
            currentNode.getAttribute('aria-label') || ''
          ).trim().substring(0, 120);

          elements.push({
            id: idCounter,
            tag: currentNode.tagName,
            type: currentNode.type || undefined,
            text,
            ariaLabel: currentNode.getAttribute('aria-label') || undefined,
            href: currentNode.tagName === 'A' ? currentNode.href : undefined,
            inViewport,
          });

          idCounter++;
        }
        currentNode = walker.nextNode();
      }

      return {
        url: window.location.href,
        title: document.title,
        elements,
      };
    });

    return state;
  }
}
