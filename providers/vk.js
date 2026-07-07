import { browserEngine, getText, getNumber } from './engine.js';
import { PARSER_CONFIG } from './config.js';

const CONFIG = PARSER_CONFIG.vk;

export async function collect(url) {
  const start = Date.now();
  let page;
  try {
    page = await browserEngine.newPage();
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    const s = CONFIG.selectors;

    const name = await getText(page, s.name);
    const members = await getNumber(page, s.members);
    const latestPost = await getText(page, s.latestPost);
    const releaseDate = await getText(page, s.latestPostDate);

    const data = { name, members, latestPost, releaseDate };
    const parsedFields = Object.keys(data).filter(k => data[k] !== null);

    return {
      followers: members,
      subscribers: null,
      monthlyListeners: null,
      monthlyPlays: null,
      popularity: null,
      latestRelease: latestPost,
      releaseDate,
      updatedAt: new Date().toISOString(),
      source: CONFIG.source,
      status: 'success',
      error: null,
      meta: {
        provider: 'vk',
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
      provider: 'vk',
      dataSource: CONFIG.source,
      collectionMethod: CONFIG.method,
      duration: Date.now() - start,
      parsedFields: [],
      missingFields: [],
    },
  };
}
