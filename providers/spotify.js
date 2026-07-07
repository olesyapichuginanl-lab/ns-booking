import { browserEngine, getText, getAllText, getNumberWithFallback, getTextWithFallback } from './engine.js';
import { PARSER_CONFIG } from './config.js';

const CONFIG = PARSER_CONFIG.spotify;

export async function collect(url) {
  const start = Date.now();
  let page;
  try {
    page = await browserEngine.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    const s = CONFIG.selectors;
    const fb = CONFIG.fallbackSelectors;

    const artistName = await getText(page, s.artistName);
    const followers = await getNumberWithFallback(page, [s.followers, fb.followers]);
    const monthlyListeners = await getNumberWithFallback(page, [s.monthlyListeners, fb.monthlyListeners]);
    const popularTracks = await getAllText(page, s.popularTracks);
    const latestRelease = await getText(page, s.latestRelease);
    const releaseDate = await getText(page, s.latestReleaseDate);
    const popularity = null; // Spotify public page does not expose a numeric popularity score.

    const parsedFields = ['artistName', 'followers', 'monthlyListeners', 'popularTracks', 'latestRelease', 'releaseDate', 'popularity']
      .filter(f => f !== 'popularity' || popularity !== null);

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
        missingFields: parsedFields.filter(f => ({
          artistName, followers, monthlyListeners, popularTracks, latestRelease, releaseDate, popularity
        })[f] === null),
      },
    };
  } catch (error) {
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
      },
    };
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
