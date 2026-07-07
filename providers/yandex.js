import { browserEngine, getText, getAllText, getNumberWithFallback, getTextWithFallback } from './engine.js';
import { PARSER_CONFIG } from './config.js';

const CONFIG = PARSER_CONFIG.yandex;

export async function collect(url) {
  const start = Date.now();
  let page;
  try {
    page = await browserEngine.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    const s = CONFIG.selectors;

    const artistName = await getTextWithFallback(page, [s.artistName, 'h1']);
    const followers = await getNumberWithFallback(page, [s.followers, '[class*="followers"]']);
    const monthlyListeners = await getNumberWithFallback(page, [s.monthlyListeners, '[class*="listeners"]']);
    const popularTracks = await getAllText(page, s.popularTracks);
    const latestRelease = await getText(page, s.latestRelease);
    const releaseDate = await getText(page, s.latestReleaseDate);

    const data = { artistName, followers, monthlyListeners, popularTracks, latestRelease, releaseDate };
    const parsedFields = Object.keys(data).filter(k => data[k] !== null && data[k].length !== 0);

    return {
      followers,
      subscribers: null,
      monthlyListeners,
      monthlyPlays: null,
      popularity: null,
      latestRelease,
      releaseDate,
      updatedAt: new Date().toISOString(),
      source: CONFIG.source,
      status: 'success',
      error: null,
      meta: {
        provider: 'yandex',
        dataSource: CONFIG.source,
        collectionMethod: CONFIG.method,
        duration: Date.now() - start,
        parsedFields,
        missingFields: Object.keys(data).filter(k => data[k] === null || data[k].length === 0),
      },
    };
  } catch (error) {
    return errorResult(start, error);
  } finally {
    if (page) await page.close().catch(() => {});
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
      provider: 'yandex',
      dataSource: CONFIG.source,
      collectionMethod: CONFIG.method,
      duration: Date.now() - start,
      parsedFields: [],
      missingFields: [],
    },
  };
}
