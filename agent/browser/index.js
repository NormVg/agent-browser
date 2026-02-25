import { chromium } from 'playwright';

export class BrowserRuntime {
  constructor() {
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  /**
   * Initialize the browser and create a new page context.
   * @param {boolean} headless - If true, runs without a visible window.
   */
  async init(headless = true) {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless,                    // ✅ Respect the parameter
        channel: 'chrome',           // Use system-installed Chrome
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
      });

      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 },
      });

      this.page = await this.context.newPage();
      this.page.setDefaultTimeout(30000); // ✅ 30s — enough for heavy pages
    }
  }

  /**
   * Close the browser entirely.
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
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
