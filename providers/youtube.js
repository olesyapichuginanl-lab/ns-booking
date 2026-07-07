import { browserEngine, getText, getNumber } from './engine.js';
import { PARSER_CONFIG } from './config.js';

const CONFIG = PARSER_CONFIG.youtube;

export async function collect(url) {
  const start = Date.now();
  let page;
  try {
    page = await browserEngine.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    const s = CONFIG.selectors;

    const channelName = await getText(page, s.channelName);
    const subscribers = await getNumber(page, s.subscribers);
    const videoCount = await getNumber(page, s.videoCount);
    const viewCount = await getNumber(page, s.viewCount);
    const latestVideo = await getText(page, s.latestVideo);
    const releaseDate = await getText(page, s.latestVideoDate);

    const data = { channelName, subscribers, videoCount, viewCount, latestVideo, releaseDate };
    const parsedFields = Object.keys(data).filter(k => data[k] !== null);

    return {
      followers: null,
      subscribers,
      monthlyListeners: null,
      monthlyPlays: viewCount,
      popularity: null,
      latestRelease: latestVideo,
      releaseDate,
      updatedAt: new Date().toISOString(),
      source: CONFIG.source,
      status: 'success',
      error: null,
      meta: {
        provider: 'youtube',
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
      provider: 'youtube',
      dataSource: CONFIG.source,
      collectionMethod: CONFIG.method,
      duration: Date.now() - start,
      parsedFields: [],
      missingFields: [],
    },
  };
}
