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
    this._locked = false; // Track lock state so we can re-inject after navigate
  }

  async init(headless = true) {
    if (this.page) return;

    this.browser = await chromium.launch({
      headless,
      channel: 'chrome',
      args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    });

    const hasAuth = fs.existsSync(AUTH_FILE);
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 },
      ...(hasAuth ? { storageState: AUTH_FILE } : {}),
    });

    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(30000);
    console.log(`[Browser] Launched ${headless ? 'headless' : 'visible'} ${hasAuth ? '(auth loaded ✓)' : '(fresh session)'}`);
  }

  async close() {
    try {
      if (this.context) {
        await this.context.storageState({ path: AUTH_FILE });
        console.log('[Browser] Auth state saved ✓');
      }
    } catch (_) { }
    try { await this.browser?.close(); } catch (_) { }
    this.browser = null;
    this.context = null;
    this.page = null;
    this._locked = false;
  }

  // ─────────────── PAGE LOCK ───────────────

  async lockPage() {
    this._locked = true;
    await this._injectOverlay();
  }

  async unlockPage() {
    this._locked = false;
    try {
      await this.page.evaluate(() => {
        document.getElementById('agent-lock-overlay')?.remove();
      });
    } catch (_) { }
  }

  /** Re-inject overlay if locked (called after navigate which destroys DOM) */
  async _injectOverlay() {
    if (!this._locked) return;
    try {
      await this.page.evaluate(() => {
        if (document.getElementById('agent-lock-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'agent-lock-overlay';
        overlay.style.cssText = `
          position: fixed; inset: 0; z-index: 2147483647;
          pointer-events: all;
          box-shadow: inset 0 0 60px 20px rgba(255,50,50,0.15), inset 0 0 4px 2px rgba(255,50,50,0.3);
          border: 2px solid rgba(255,50,50,0.25);
        `;
        const badge = document.createElement('div');
        badge.style.cssText = `
          position: fixed; top: 8px; left: 50%; transform: translateX(-50%);
          z-index: 2147483647; pointer-events: none;
          background: rgba(0,0,0,0.8); color: #ff5555; padding: 6px 18px;
          border-radius: 20px; font: 600 12px/1 -apple-system, sans-serif;
          letter-spacing: 0.5px; border: 1px solid rgba(255,50,50,0.3);
          box-shadow: 0 2px 12px rgba(0,0,0,0.4);
        `;
        badge.textContent = '🤖 AI Agent Working...';
        overlay.appendChild(badge);
        document.body.appendChild(overlay);
      });
    } catch (_) { }
  }

  /**
   * Temporarily disable overlay for a Playwright action — always restores,
   * even if the action throws.
   */
  async _withOverlayOff(fn) {
    try {
      await this.page.evaluate(() => {
        const o = document.getElementById('agent-lock-overlay');
        if (o) o.style.pointerEvents = 'none';
      });
    } catch (_) { }

    try {
      return await fn();
    } finally {
      try {
        await this.page.evaluate(() => {
          const o = document.getElementById('agent-lock-overlay');
          if (o) o.style.pointerEvents = 'all';
        });
      } catch (_) { }
    }
  }

  // ─────────────── ACTION LAYER ───────────────

  async navigate(url) {
    try {
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.page.waitForTimeout(1500);
    } catch (e) {
      console.warn(`[Browser] Navigation timeout for ${url}, continuing.`);
    }
    // Navigation destroys DOM — re-inject overlay + highlight styles
    await this._injectOverlay();
  }

  async highlight(elementId) {
    try {
      await this.page.evaluate((id) => {
        const el = document.querySelector(`[data-agent-id="${id}"]`);
        if (!el) return;
        if (!document.getElementById('agent-highlight-style')) {
          const style = document.createElement('style');
          style.id = 'agent-highlight-style';
          style.textContent = `
            @keyframes agent-pulse {
              0%   { outline-color: #ff3333; box-shadow: 0 0 0 0 rgba(255,51,51,0.6); }
              50%  { outline-color: #ff6666; box-shadow: 0 0 12px 4px rgba(255,51,51,0.3); }
              100% { outline-color: #ff3333; box-shadow: 0 0 0 0 rgba(255,51,51,0); }
            }
          `;
          document.head.appendChild(style);
        }
        el.style.outline = '3px solid #ff3333';
        el.style.outlineOffset = '2px';
        el.style.animation = 'agent-pulse 0.6s ease-in-out 2';
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => {
          el.style.outline = '';
          el.style.outlineOffset = '';
          el.style.animation = '';
        }, 1500);
      }, elementId);
      await this.page.waitForTimeout(400);
    } catch (_) { }
  }

  async click(elementId) {
    const locator = this.page.locator(`[data-agent-id="${elementId}"]`);
    await locator.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => { });
    await this.highlight(elementId);
    await this._withOverlayOff(() => locator.click({ timeout: 10000 }));
  }

  async type(elementId, text) {
    const locator = this.page.locator(`[data-agent-id="${elementId}"]`);
    await locator.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => { });
    await this.highlight(elementId);
    await this._withOverlayOff(() => locator.fill(text));
  }

  async pressEnter() {
    await this.page.keyboard.press('Enter');
    await this.page.waitForTimeout(1000);
  }

  async selectOption(elementId, value) {
    const locator = this.page.locator(`[data-agent-id="${elementId}"]`);
    await this.highlight(elementId);
    await this._withOverlayOff(() => locator.selectOption(value));
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

  // ─────────────── VERIFICATION LAYER ───────────────

  async verifyAction(action) {
    try {
      await this.page.waitForTimeout(300);
      switch (action.action) {
        case 'navigate': {
          const url = this.page.url();
          return url && url !== 'about:blank'
            ? { ok: true, detail: `On ${url}` }
            : { ok: false, detail: 'Still on blank page' };
        }
        case 'type': {
          const value = await this.page.evaluate((id) => {
            const el = document.querySelector(`[data-agent-id="${id}"]`);
            return el?.value || el?.innerText || '';
          }, String(action.elementId));
          const match = value.includes(action.text) || action.text.includes(value);
          return match
            ? { ok: true, detail: `Field has "${value.substring(0, 50)}"` }
            : { ok: false, detail: `Expected "${action.text}" but got "${value.substring(0, 50)}"` };
        }
        case 'click': {
          const state = await this.page.evaluate((id) => {
            const el = document.querySelector(`[data-agent-id="${id}"]`);
            if (!el) return { exists: false };
            return {
              exists: true,
              checked: el.checked || el.getAttribute('aria-checked') === 'true',
              role: el.getAttribute('role'),
            };
          }, String(action.elementId));
          if (!state.exists) return { ok: true, detail: 'Element gone (page likely changed — ok)' };
          if (state.role === 'radio' || state.role === 'checkbox') {
            return state.checked
              ? { ok: true, detail: `${state.role} checked ✓` }
              : { ok: false, detail: `${state.role} NOT toggled` };
          }
          return { ok: true, detail: `Clicked #${action.elementId}` };
        }
        case 'selectOption': {
          const selected = await this.page.evaluate((id) => {
            const el = document.querySelector(`[data-agent-id="${id}"]`);
            if (el?.tagName === 'SELECT') return el.options[el.selectedIndex]?.text || '';
            return '';
          }, String(action.elementId));
          const match = selected && action.value && selected.toLowerCase().includes(action.value.toLowerCase());
          return match
            ? { ok: true, detail: `Selected "${selected}"` }
            : { ok: false, detail: `Expected "${action.value}" got "${selected}"` };
        }
        default:
          return { ok: true, detail: 'ok' };
      }
    } catch (e) {
      return { ok: true, detail: `Verify skipped: ${e.message}` };
    }
  }

  // ─────────────── PERCEPTION LAYER ───────────────

  async observeState() {
    if (!this.page) throw new Error('Browser not initialized.');
    try { await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 }); } catch (_) { }

    const state = await this.page.evaluate(() => {
      let idCounter = 1;
      const elements = [];
      const interactableTags = new Set(['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION']);
      const formRoles = new Set(['radio', 'checkbox', 'option', 'listbox', 'combobox', 'searchbox', 'button', 'link', 'menuitem', 'switch', 'tab']);
      const labelTags = new Set(['LABEL', 'LEGEND']);
      const skipIds = new Set(['agent-lock-overlay', 'agent-lock-badge', 'agent-highlight-style']);

      const walker = document.createTreeWalker(
        document.body || document.documentElement,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode(node) {
            // Skip agent-injected elements entirely
            if (skipIds.has(node.id)) return NodeFilter.FILTER_REJECT;
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
        // Skip agent elements that somehow passed the filter
        if (currentNode.id && skipIds.has(currentNode.id)) {
          currentNode = walker.nextNode();
          continue;
        }

        let isInteractable = interactableTags.has(currentNode.tagName);
        if (!isInteractable) {
          const role = currentNode.getAttribute('role');
          if (role && formRoles.has(role)) {
            isInteractable = true;
          } else if (currentNode.onclick || currentNode.getAttribute('tabindex') === '0') {
            isInteractable = true;
          }
        }

        const isLabel = labelTags.has(currentNode.tagName) || currentNode.getAttribute('role') === 'heading';
        const isHeading = currentNode.tagName === 'H1' || currentNode.tagName === 'H2' || currentNode.tagName === 'H3';

        if (isInteractable || isHeading || isLabel) {
          const rect = currentNode.getBoundingClientRect();
          const inViewport = rect.width > 0 && rect.height > 0 &&
            rect.top >= -100 && rect.bottom <= (window.innerHeight + 100);

          currentNode.setAttribute('data-agent-id', idCounter.toString());

          const text = (
            currentNode.innerText ||
            currentNode.getAttribute('placeholder') ||
            currentNode.value ||
            currentNode.getAttribute('aria-label') ||
            currentNode.getAttribute('data-value') || ''
          ).trim().substring(0, 100);

          const role = currentNode.getAttribute('role');
          const isChecked = currentNode.checked
            || currentNode.getAttribute('aria-checked') === 'true'
            || currentNode.getAttribute('aria-selected') === 'true';

          elements.push({
            id: idCounter,
            tag: currentNode.tagName,
            type: currentNode.type || undefined,
            role: role || undefined,
            text,
            ariaLabel: currentNode.getAttribute('aria-label') || undefined,
            href: currentNode.tagName === 'A' ? currentNode.href : undefined,
            checked: isChecked || undefined,
            inViewport,
          });
          idCounter++;
        }
        currentNode = walker.nextNode();
      }

      return { url: window.location.href, title: document.title, elements };
    });

    return state;
  }
}
