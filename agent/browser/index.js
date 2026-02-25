import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, '..', '..', 'auth.json');

export class BrowserRuntime {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  /**
   * Launch a clean Chromium instance.
   * If auth.json exists from a previous session, load it
   * so we get all saved cookies/logins without touching the real profile.
   *
   * First run  → blank session (user logs in if needed)
   * After that → auth.json is loaded automatically = instant logins
   *
   * No CDP, no persistent context, no profile lock, no corruption.
   */
  async init(headless = true) {
    if (this.page) return;

    this.browser = await chromium.launch({
      headless,
      channel: 'chrome',
      args: [
        '--no-sandbox',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    // Load saved auth state if available
    const hasAuth = fs.existsSync(AUTH_FILE);
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 },
      ...(hasAuth ? { storageState: AUTH_FILE } : {}),
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(30000);

    console.log(`[Browser] Launched ${headless ? 'headless' : 'visible'} ${hasAuth ? '(auth loaded ✓)' : '(fresh session)'}`);
  }

  /**
   * Save auth state and close.
   * Next run will auto-load cookies/logins from auth.json.
   */
  async close() {
    try {
      // Persist auth state for next run
      if (this.context) {
        await this.context.storageState({ path: AUTH_FILE });
        console.log('[Browser] Auth state saved to auth.json ✓');
      }
    } catch (_) { }
    try {
      await this.browser?.close();
    } catch (_) { }
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  // ------------- ACTION LAYER -------------

  async navigate(url) {
    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.page.waitForTimeout(1500);
    } catch (e) {
      console.warn(`[Browser] Navigation timeout for ${url}, continuing.`);
    }
  }

  async click(elementId) {
    try {
      const locator = this.page.locator(`[data-agent-id="${elementId}"]`);
      await locator.scrollIntoViewIfNeeded();
      await locator.click({ timeout: 10000 });
    } catch (e) {
      throw new Error(`Click #${elementId} failed: ${e.message}`);
    }
  }

  async type(elementId, text) {
    try {
      const locator = this.page.locator(`[data-agent-id="${elementId}"]`);
      await locator.scrollIntoViewIfNeeded();
      await locator.fill(text);
    } catch (e) {
      throw new Error(`Type into #${elementId} failed: ${e.message}`);
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
