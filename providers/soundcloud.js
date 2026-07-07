import { browserEngine, getText, getNumber } from './engine.js';
import { PARSER_CONFIG } from './config.js';

const CONFIG = PARSER_CONFIG.soundcloud;

export async function collect(url) {
  const start = Date.now();
  let page;
  try {
    page = await browserEngine.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    const s = CONFIG.selectors;

    const artistName = await getText(page, s.artistName);
    const followers = await getNumber(page, s.followers);
    const tracks = await getNumber(page, s.tracks);
    const latestTrack = await getText(page, s.latestTrack);
    const releaseDate = await getText(page, s.latestTrackDate);

    const data = { artistName, followers, tracks, latestTrack, releaseDate };
    const parsedFields = Object.keys(data).filter(k => data[k] !== null);

    return {
      followers,
      subscribers: null,
      monthlyListeners: null,
      monthlyPlays: null,
      popularity: null,
      latestRelease: latestTrack,
      releaseDate,
      updatedAt: new Date().toISOString(),
      source: CONFIG.source,
      status: 'success',
      error: null,
      meta: {
        provider: 'soundcloud',
        dataSource: CONFIG.source,
        collectionMethod: CONFIG.method,
        duration: Date.now() - start,
        parsedFields,
        missingFields: Object.keys(data).filter(k => data[k] === null),
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
      provider: 'soundcloud',
      dataSource: CONFIG.source,
      collectionMethod: CONFIG.method,
      duration: Date.now() - start,
      parsedFields: [],
      missingFields: [],
    },
  };
}
