import { chromium } from 'playwright';
import os from 'os';
import path from 'path';

// User Data Directory — Playwright automatically looks for the 'Default' profile inside this folder.
const CHROME_PROFILE = path.join(
  os.homedir(),
  'Library/Application Support/Google/Chrome'
);

export class BrowserRuntime {
  constructor() {
    this.browser = null;   // CDP or owned launch
    this.context = null;
    this.page = null;
    this.mode = null;   // 'cdp' | 'owned' | 'sandbox'
    this.agentPage = null;   // the tab we opened — we only close this
  }

  /**
   * Safe browser init strategy (in order of preference):
   *
   * 1. CDP   — connect to Chrome already running with --remote-debugging-port=9222
   *            We only close our own page. Chrome and all sessions untouched.
   * 2. Owned — launch Chrome fresh from the real profile.
   *            We only close our page; Chrome keeps running with profile intact.
   * 3. Sandbox — fresh profile. No logins but harmless.
   *
   * ⚠️  We NEVER call context.close() on the real profile — that corrupts it.
   */
  async init(headless = true) {
    if (this.page) return;

    const launchArgs = [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--remote-debugging-port=9222',       // opens debug port so next run can connect via CDP
    ];

    // ── 1. Try CDP first ──────────────────────────────────────────
    try {
      this.browser = await chromium.connectOverCDP('http://localhost:9222');
      this.context = this.browser.contexts()[0];
      this.agentPage = await this.context.newPage();
      this.page = this.agentPage;
      this.mode = 'cdp';
      console.log('[Browser] Connected to running Chrome via CDP ✓ (all your accounts available)');
      return;
    } catch (_) {
      // Chrome not running with CDP — try launching it ourselves
    }

    // ── 2. Launch our own Chrome from real profile ────────────────
    try {
      this.browser = await chromium.launchPersistentContext(CHROME_PROFILE, {
        headless,
        channel: 'chrome',
        args: launchArgs,
        viewport: { width: 1280, height: 800 },
      });
      this.context = this.browser;           // launchPersistentContext IS the context
      this.agentPage = await this.context.newPage();
      this.page = this.agentPage;
      this.mode = 'owned';
      console.log('[Browser] Launched Chrome with your real profile ✓');
      return;
    } catch (e) {
      if (!e.message.includes('lock') && !e.message.includes('LOCK')) throw e;
      // Profile locked by another Chrome — must use sandbox
      console.warn('[Browser] Profile locked. Close Chrome first for account access. Using sandbox fallback.');
    }

    // ── 3. Sandboxed fallback ─────────────────────────────────────
    const fresh = await chromium.launch({ headless, channel: 'chrome', args: ['--no-sandbox'] });
    this.browser = fresh;
    this.context = await fresh.newContext({ viewport: { width: 1280, height: 800 } });
    this.agentPage = await this.context.newPage();
    this.page = this.agentPage;
    this.mode = 'sandbox';
    console.log('[Browser] Running in sandboxed mode (no logins). Start Chrome with --remote-debugging-port=9222 to use your accounts.');
  }

  /**
   * Only close the page we opened.
   * NEVER close the browser or context when using real profile — that would corrupt it.
   */
  async close() {
    try {
      if (this.mode === 'sandbox') {
        // Sandbox — we own the whole browser, safe to kill
        await this.browser?.close();
      } else {
        // Real profile (cdp or owned) — only close the tab we opened
        await this.agentPage?.close();
        // If we own the launch, disconnect gracefully (doesn't kill Chrome)
        if (this.mode === 'owned') await this.browser?.close();
      }
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
      // ✅ Only wait for DOM — not networkidle (which hangs on SPAs / YouTube)
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.page.waitForTimeout(1500); // Let JS hydrate briefly
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
      await locator.fill(text); // fill() is faster and more reliable than type()
    } catch (e) {
      throw new Error(`Failed to type into element ${elementId}: ${e.message}`);
    }
  }

  // ✅ New: press Enter — useful after typing in a search box
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
   * Extracts a simplified DOM snapshot. Injects data-agent-id for clickable elements.
   */
  async observeState() {
    if (!this.page) throw new Error('Browser not initialized.');

    try {
      await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    } catch (_) {
      // Best-effort — continue even if not fully loaded
    }

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
