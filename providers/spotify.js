import { browserEngine, getText, getAllText, getNumberWithFallback, getNumberByText, getTextByContains, evaluatePage } from './engine.js';
import { PARSER_CONFIG } from './config.js';

const CONFIG = PARSER_CONFIG.spotify;

export async function collect(url) {
  const start = Date.now();
  let page;
  let context;
  try {
    context = await browserEngine.newContext({ locale: 'en-US' });
    page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.waitForSelector('h1, [data-testid="entity-title"], [data-testid="monthly-listeners"]', { timeout: 30000 }).catch(() => {});

    const s = CONFIG.selectors;
    const fb = CONFIG.fallbackSelectors;

    const artistName = await getText(page, 'h1') || await getText(page, s.artistName) || await getTextWithFallback(page, [s.artistName]);
    const monthlyListeners = await getNumberByText(page, 'monthly listeners')
      || await getNumberWithFallback(page, [s.monthlyListeners, fb.monthlyListeners]);
    const followers = await getNumberByText(page, 'followers')
      || await getNumberWithFallback(page, [s.followers, fb.followers]);

    const popularTracks = await evaluatePage(page, () => {
      const tracks = [];
      document.querySelectorAll('div[role="row"]').forEach(row => {
        const link = row.querySelector('a[href*="/track/"]');
        if (link) tracks.push(link.textContent.trim());
      });
      return tracks.slice(0, 5);
    }) || [];

    const latestRelease = await evaluatePage(page, () => {
      const links = document.querySelectorAll('a[href*="/album/"], a[href*="/single/"]');
      for (const link of links) {
        const text = link.textContent.trim();
        if (text) return text;
      }
      return null;
    }) || await getTextByContains(page, 'Latest release');

    const releaseDate = await getTextByContains(page, 'Latest release') || null;
    const popularity = null; // Spotify public page does not expose a numeric popularity score.

    const rawValues = { artistName, followers, monthlyListeners, popularTracks, latestRelease, releaseDate };
    const parsedFields = Object.keys(rawValues).filter(k => {
      const v = rawValues[k];
      return v !== null && v !== undefined && (typeof v !== 'object' || v.length > 0);
    });

    const allMissing = parsedFields.length === 0;
    if (allMissing) {
      return errorResult(start, new Error('No public statistics found on the page. The page may be blocked, require login, or have changed layout.'));
    }

    return {
      followers,
      subscribers: null,
      monthlyListeners,
      monthlyPlays: null,
      popularity,
      latestRelease,
      releaseDate,
      updatedAt: new Date().toISOString(),
      source: CONFIG.source,
      status: 'success',
      error: null,
      meta: {
        provider: 'spotify',
        dataSource: CONFIG.source,
        collectionMethod: CONFIG.method,
        duration: Date.now() - start,
        parsedFields,
        missingFields: Object.keys(rawValues).filter(k => !parsedFields.includes(k)),
        rawValues,
      },
    };
  } catch (error) {
    return errorResult(start, error);
  } finally {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
  }
}

function errorResult(start, error) {
  return {
    followers: null,
    subscribers: null,
    monthlyListeners: null,
    monthlyPlays: null,
    popularity: null,
    latestRelease: null,
    releaseDate: null,
    updatedAt: new Date().toISOString(),
    source: CONFIG.source,
    status: 'error',
    error: error.message,
    meta: {
      provider: 'spotify',
      dataSource: CONFIG.source,
      collectionMethod: CONFIG.method,
      duration: Date.now() - start,
      parsedFields: [],
      missingFields: [],
      rawValues: null,
    },
  };
}

async function getTextWithFallback(page, selectors) {
  for (const selector of selectors) {
    const text = await getText(page, selector);
    if (text) return text;
  }
  return null;
}
