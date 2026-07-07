import { chromium } from 'playwright';

/**
 * Shared Playwright engine for all providers.
 * Launches a single browser instance and reuses contexts across scrapes.
 */

export class BrowserEngine {
  constructor(options = {}) {
    this.browser = null;
    this.options = options;
  }

  async launch() {
    if (this.browser) return this.browser;
    this.browser = await chromium.launch({
      headless: true,
      ...this.options,
    });
    return this.browser;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async newContext(options = {}) {
    const browser = await this.launch();
    return browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
      ...options,
    });
  }

  async newPage(options = {}) {
    const context = await this.newContext(options);
    return context.newPage();
  }
}

export const browserEngine = new BrowserEngine();

export async function getText(page, selector) {
  try {
    const el = page.locator(selector).first();
    if (!(await el.count())) return null;
    const text = await el.textContent();
    return text?.trim() || null;
  } catch {
    return null;
  }
}

export async function getAllText(page, selector) {
  try {
    const locators = await page.locator(selector).all();
    const texts = [];
    for (const loc of locators) {
      const text = await loc.textContent();
      if (text?.trim()) texts.push(text.trim());
    }
    return texts;
  } catch {
    return [];
  }
}

export function parseNumber(text) {
  if (text === null || text === undefined) return null;
  const cleaned = String(text)
    .replace(/[^\d.,KMBkmb]/g, '')
    .replace(/,/g, '');
  if (!cleaned) return null;

  const multiplierMatch = cleaned.match(/([\d.]+)([KMB])/i);
  if (multiplierMatch) {
    const base = parseFloat(multiplierMatch[1]);
    const suffix = multiplierMatch[2].toUpperCase();
    const multipliers = { K: 1_000, M: 1_000_000, B: 1_000_000_000 };
    return Math.round(base * multipliers[suffix]);
  }

  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? Math.round(value) : null;
}

export async function getNumber(page, selector) {
  const text = await getText(page, selector);
  return parseNumber(text);
}

export async function getTextWithFallback(page, selectors) {
  for (const selector of selectors) {
    const text = await getText(page, selector);
    if (text) return text;
  }
  return null;
}

export async function getNumberWithFallback(page, selectors) {
  for (const selector of selectors) {
    const value = await getNumber(page, selector);
    if (value !== null) return value;
  }
  return null;
}
