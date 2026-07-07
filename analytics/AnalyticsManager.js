import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as spotify from '../providers/spotify.js';
import * as youtube from '../providers/youtube.js';
import * as instagram from '../providers/instagram.js';
import * as soundcloud from '../providers/soundcloud.js';
import * as vk from '../providers/vk.js';
import * as yandex from '../providers/yandex.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '..', 'data');
const CACHE_DIR = path.join(DATA_DIR, 'cache');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const PLATFORM_ORDER = ['spotify', 'youtube', 'instagram', 'soundcloud', 'vk', 'yandex'];

const providerMap = {
  spotify,
  youtube,
  instagram,
  soundcloud,
  vk,
  yandex,
};

export class AnalyticsManager {
  constructor(options = {}) {
    this.cacheDir = options.cacheDir || CACHE_DIR;
    this.historyDir = options.historyDir || HISTORY_DIR;
    this.refreshInterval = options.refreshInterval || REFRESH_INTERVAL_MS;
    this.ensureDirectories();
  }

  ensureDirectories() {
    fs.mkdirSync(this.cacheDir, { recursive: true });
    fs.mkdirSync(this.historyDir, { recursive: true });
  }

  cachePath(artistId) {
    return path.join(this.cacheDir, `${artistId}.json`);
  }

  historyPath(artistId) {
    return path.join(this.historyDir, `${artistId}.json`);
  }

  loadCache(artistId) {
    try {
      const file = this.cachePath(artistId);
      if (!fs.existsSync(file)) return null;
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!data.lastUpdated) return null;

      const age = Date.now() - new Date(data.lastUpdated).getTime();
      if (age > this.refreshInterval) {
        return { ...data, expired: true };
      }
      return { ...data, expired: false };
    } catch (error) {
      console.error(`Failed to load cache for ${artistId}:`, error.message);
      return null;
    }
  }

  saveCache(artistId, analytics) {
    try {
      fs.writeFileSync(this.cachePath(artistId), JSON.stringify(analytics, null, 2));
    } catch (error) {
      console.error(`Failed to save cache for ${artistId}:`, error.message);
    }
  }

  loadHistory(artistId) {
    try {
      const file = this.historyPath(artistId);
      if (!fs.existsSync(file)) return [];
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
      console.error(`Failed to load history for ${artistId}:`, error.message);
      return [];
    }
  }

  saveHistory(artistId, snapshot) {
    if (!snapshot) return;
    try {
      const history = this.loadHistory(artistId);
      history.push(snapshot);
      fs.writeFileSync(this.historyPath(artistId), JSON.stringify(history, null, 2));
    } catch (error) {
      console.error(`Failed to save history for ${artistId}:`, error.message);
    }
  }

  async refreshPlatform(platform, url) {
    const provider = providerMap[platform];
    if (!provider || !provider.collect) {
      return {
        url,
        status: 'error',
        error: `Provider ${platform} not found`,
        updatedAt: new Date().toISOString(),
      };
    }

    try {
      const result = await provider.collect(url);
      return { ...result, url, platform };
    } catch (error) {
      return {
        url,
        platform,
        status: 'error',
        error: error.message,
        updatedAt: new Date().toISOString(),
      };
    }
  }

  async refreshArtistAnalytics(artist) {
    const artistId = artist.id || 'unknown';
    const cached = this.loadCache(artistId);

    if (cached && !cached.expired) {
      return { ...cached, cached: true };
    }

    const urls = PLATFORM_ORDER
      .map(platform => ({ platform, url: artist[platform] }))
      .filter(({ url }) => typeof url === 'string' && url.trim().length > 0);

    const results = {};
    for (const { platform, url } of urls) {
      results[platform] = await this.refreshPlatform(platform, url);
    }

    const analytics = this.buildAnalyticsModel(artistId, results, cached);

    // Save history for every successful provider refresh
    for (const platform of PLATFORM_ORDER) {
      const result = results[platform];
      if (result && result.status === 'success') {
        this.saveHistory(artistId, this.createHistorySnapshot(platform, result));
      }
    }

    // Save a summary snapshot if at least one provider succeeded
    const successfulPlatforms = Object.values(results).filter(r => r.status === 'success');
    if (successfulPlatforms.length > 0) {
      this.saveHistory(artistId, this.createSummarySnapshot(analytics.summary));
    }

    this.saveCache(artistId, analytics);
    return { ...analytics, cached: false };
  }

  createHistorySnapshot(platform, result) {
    return {
      date: result.updatedAt || new Date().toISOString(),
      platform,
      followers: result.followers ?? null,
      subscribers: result.subscribers ?? null,
      monthlyListeners: result.monthlyListeners ?? null,
      monthlyPlays: result.monthlyPlays ?? null,
      popularity: result.popularity ?? null,
      latestRelease: result.latestRelease ?? null,
      releaseDate: result.releaseDate ?? null,
    };
  }

  createSummarySnapshot(summary) {
    return {
      date: summary.lastUpdated,
      platform: 'summary',
      followers: summary.totalFollowers ?? null,
      subscribers: summary.totalSubscribers ?? null,
      monthlyListeners: summary.totalMonthlyListeners ?? null,
      monthlyPlays: summary.totalMonthlyPlays ?? null,
      popularity: summary.avgPopularity ?? null,
      latestRelease: summary.latestRelease?.title ?? null,
      releaseDate: summary.latestRelease?.date ?? null,
    };
  }

  buildAnalyticsModel(artistId, results, cached = null) {
    const platforms = {};
    const summary = {
      totalFollowers: 0,
      totalSubscribers: 0,
      totalMonthlyListeners: 0,
      totalMonthlyPlays: 0,
      avgPopularity: null,
      platformsConnected: 0,
      platformsWithErrors: 0,
      latestRelease: null,
      lastUpdated: new Date().toISOString(),
      bookingPotential: null,
    };

    let popularitySum = 0;
    let popularityCount = 0;
    let latestReleaseCandidate = null;

    for (const platform of PLATFORM_ORDER) {
      const result = results[platform];
      if (!result) {
        platforms[platform] = this.emptyPlatformResult();
        continue;
      }

      platforms[platform] = {
        url: result.url || null,
        status: result.status || 'error',
        error: result.error || null,
        followers: result.followers ?? null,
        subscribers: result.subscribers ?? null,
        monthlyListeners: result.monthlyListeners ?? null,
        monthlyPlays: result.monthlyPlays ?? null,
        popularity: result.popularity ?? null,
        latestRelease: result.latestRelease ?? null,
        releaseDate: result.releaseDate ?? null,
        updatedAt: result.updatedAt || null,
        source: result.source || 'Public Artist Page',
        meta: result.meta || null,
      };

      if (result.status === 'success') {
        summary.platformsConnected += 1;
        if (result.followers !== null) summary.totalFollowers += result.followers;
        if (result.subscribers !== null) summary.totalSubscribers += result.subscribers;
        if (result.monthlyListeners !== null) summary.totalMonthlyListeners += result.monthlyListeners;
        if (result.monthlyPlays !== null) summary.totalMonthlyPlays += result.monthlyPlays;
        if (result.popularity !== null) {
          popularitySum += result.popularity;
          popularityCount += 1;
        }

        if (result.latestRelease && result.releaseDate) {
          const releaseDate = new Date(result.releaseDate);
          if (!latestReleaseCandidate || releaseDate > new Date(latestReleaseCandidate.date)) {
            latestReleaseCandidate = { title: result.latestRelease, date: result.releaseDate, platform };
          }
        }
      } else {
        summary.platformsWithErrors += 1;
      }
    }

    if (popularityCount > 0) {
      summary.avgPopularity = Math.round(popularitySum / popularityCount);
    }
    summary.latestRelease = latestReleaseCandidate;

    // Preserve previous successful values when a refresh fails
    if (cached && cached.platforms) {
      for (const platform of PLATFORM_ORDER) {
        const current = platforms[platform];
        if (current.status === 'error' && cached.platforms[platform]?.status === 'success') {
          const previous = cached.platforms[platform];
          platforms[platform] = {
            ...previous,
            status: 'stale',
            error: current.error,
            updatedAt: previous.updatedAt,
          };
        }
      }
    }

    const history = this.loadHistory(artistId);
    const charts = this.buildCharts(history);

    return {
      artistId,
      lastUpdated: summary.lastUpdated,
      platforms,
      summary,
      charts,
      history: this.loadHistory(artistId),
      aiInsight: 'Not enough historical data.',
      debug: this.buildDebugInfo(results),
    };
  }

  emptyPlatformResult() {
    return {
      url: null,
      status: 'not_configured',
      error: null,
      followers: null,
      subscribers: null,
      monthlyListeners: null,
      monthlyPlays: null,
      popularity: null,
      latestRelease: null,
      releaseDate: null,
      updatedAt: null,
      source: null,
      meta: null,
    };
  }

  buildCharts(history) {
    if (!Array.isArray(history) || history.length < 2) {
      return {
        followersGrowth: [],
        subscribersGrowth: [],
        monthlyPlaysTrend: [],
        releaseTimeline: [],
      };
    }

    const sorted = history.slice().sort((a, b) => new Date(a.date) - new Date(b.date));

    const followersGrowth = sorted
      .filter(h => h.followers !== null)
      .map(h => ({ date: h.date, value: h.followers, platform: h.platform }));

    const subscribersGrowth = sorted
      .filter(h => h.subscribers !== null)
      .map(h => ({ date: h.date, value: h.subscribers, platform: h.platform }));

    const monthlyPlaysTrend = sorted
      .filter(h => h.monthlyPlays !== null)
      .map(h => ({ date: h.date, value: h.monthlyPlays, platform: h.platform }));

    const releaseMap = new Map();
    for (const h of sorted) {
      if (!h.latestRelease || !h.releaseDate) continue;
      const key = `${h.latestRelease}|${h.releaseDate}`;
      if (!releaseMap.has(key)) {
        releaseMap.set(key, { title: h.latestRelease, date: h.releaseDate, platforms: new Set() });
      }
      releaseMap.get(key).platforms.add(h.platform);
    }
    const releaseTimeline = Array.from(releaseMap.values())
      .map(r => ({ ...r, platforms: Array.from(r.platforms) }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    return { followersGrowth, subscribersGrowth, monthlyPlaysTrend, releaseTimeline };
  }

  buildDebugInfo(results) {
    const debug = {};
    for (const [platform, result] of Object.entries(results)) {
      debug[platform] = {
        provider: platform,
        status: result.status || 'unknown',
        lastRefresh: result.updatedAt || null,
        duration: result.meta?.duration ?? null,
        parsedFields: result.meta?.parsedFields ?? [],
        missingFields: result.meta?.missingFields ?? [],
        lastError: result.error || result.meta?.error || null,
      };
    }
    return debug;
  }
}

export default AnalyticsManager;
