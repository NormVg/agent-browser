import { chromium } from 'playwright';
import os from 'os';
import path from 'path';

// Real Chrome profile — has all your cookies, logins, history
const CHROME_PROFILE = path.join(
  os.homedir(),
  'Library/Application Support/Google/Chrome/Default'
);

export class BrowserRuntime {
  constructor() {
    this.browser = null;   // Only used in fallback (non-persistent) mode
    this.context = null;
    this.page = null;
    this.persistent = false;
  }

  /**
   * Init browser using the user's real Chrome profile.
   * Falls back to a fresh sandboxed context if the profile is locked
   * (e.g. Chrome is already running).
   */
  async init(headless = true) {
    if (this.context) return; // Already initialized

    const launchArgs = ['--no-sandbox', '--disable-blink-features=AutomationControlled'];

    try {
      // Try persistent context with real Chrome profile
      this.context = await chromium.launchPersistentContext(CHROME_PROFILE, {
        headless,
        channel: 'chrome',
        args: launchArgs,
        viewport: { width: 1280, height: 800 },
      });
      this.persistent = true;
      console.log('[Browser] Using real Chrome profile ✓');
    } catch (e) {
      // Profile locked (Chrome already open) — fall back to fresh context
      console.warn('[Browser] Chrome profile locked, using fresh session:', e.message);
      this.browser = await chromium.launch({
        headless,
        channel: 'chrome',
        args: launchArgs,
      });
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 800 },
      });
      this.persistent = false;
    }

    this.page = this.context.pages()[0] || await this.context.newPage();
    this.page.setDefaultTimeout(30000);
  }

  async close() {
    try {
      if (this.persistent && this.context) {
        await this.context.close();
      } else if (this.browser) {
        await this.browser.close();
      }
    } catch (_) { }
    this.browser = null;
    this.context = null;
    this.page = null;
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
