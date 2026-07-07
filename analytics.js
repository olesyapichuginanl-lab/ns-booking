/**
 * Artist Intelligence — Provider-based Analytics module
 * Architecture:
 *   - CRM stores only URLs.
 *   - PlatformManager validates links and extracts IDs.
 *   - Each Provider returns normalized platform data.
 *   - AnalyticsService builds a unified internal model.
 *   - UI consumes only the normalized model.
 */

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────────────────────────────
  function hashString(str) {
    let h = 0;
    for (let i = 0; i < (str || '').length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function createSeededRandom(seed) {
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function randBetween(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
  }

  function randFloat(rng, min, max) {
    return rng() * (max - min) + min;
  }

  function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
  }

  function formatNumber(n) {
    if (n === undefined || n === null || n === 0) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toString();
  }

  function formatPercent(n) {
    if (n === undefined || n === null) return '-';
    const sign = n > 0 ? '+' : '';
    return `${sign}${n.toFixed(1)}%`;
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(date) {
    if (!date) return '-';
    const d = new Date(date);
    if (isNaN(d)) return '-';
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(d);
  }

  function daysSince(date) {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d)) return null;
    return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  }

  function trendIndicator(change) {
    const value = parseFloat(change) || 0;
    const sign = value >= 0 ? '↑' : '↓';
    const cls = value >= 0 ? 'text-emerald-400' : 'text-rose-400';
    return `<span class="${cls}">${sign} ${Math.abs(value).toFixed(1)}%</span>`;
  }

  function pickOne(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RELEASE DATA
  // ─────────────────────────────────────────────────────────────────────────────
  const RELEASE_NAMES = [
    'Echoes of Tomorrow', 'Neon Nights', 'Static Bloom', 'Afterglow EP',
    'Midnight Signal', 'Pulse Theory', 'Gravity Shift', 'Lost Frequencies',
    'Vivid Dreams', 'Resonance', 'Shadows & Light', 'Horizon', 'Orbital',
    'Quantum Bloom', 'Silent Frequency', 'Prism', 'Aurora', 'Nocturnal'
  ];

  function randomRecentRelease(rng) {
    const date = new Date();
    date.setDate(date.getDate() - randBetween(rng, 7, 180));
    return {
      title: pickOne(rng, RELEASE_NAMES),
      date: date.toISOString().split('T')[0]
    };
  }

  // Realistic audience estimate derived from CRM data (fee, genre, country, name).
  // The same artist + platform always produces the same number (seeded), but the
  // scale follows the artist's booking fee tier.
  function estimateArtistAudience(artist) {
    const fee = parseInt(artist?.bookingFee) || parseInt(artist?.price) || 0;
    const entropy = hashString((artist?.name || '') + '|' + (artist?.genre || '') + '|' + (artist?.country || '')) / 2147483647;
    const variation = 0.5 + entropy; // 0.5x .. 1.5x

    let base = 1000;
    if (fee >= 10000) base = 500000;
    else if (fee >= 5000) base = 200000;
    else if (fee >= 2000) base = 80000;
    else if (fee >= 1000) base = 30000;
    else if (fee >= 500) base = 10000;
    else if (fee >= 100) base = 3000;

    return Math.max(100, Math.floor(base * variation));
  }

  function estimatePlatformFollowers(artist, platform, rng) {
    const base = estimateArtistAudience(artist);
    const ranges = {
      spotify:   [0.50, 2.50], // Spotify monthly listeners can be the largest
      youtube:   [0.10, 1.00], // YouTube subscribers are harder to earn
      instagram: [0.20, 2.00], // Instagram followers often match Spotify
      soundcloud:[0.05, 0.50], // SoundCloud is usually smaller
      vk:        [0.10, 1.50], // VK audience for Russian-speaking artists
      yandex:    [0.10, 1.00]  // Yandex Music listeners
    };
    const [min, max] = ranges[platform] || [0.1, 1.0];
    return randBetween(rng, Math.floor(base * min), Math.max(Math.floor(base * min) + 1, Math.floor(base * max)));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PLATFORM CONFIGURATION
  // ─────────────────────────────────────────────────────────────────────────────
  const PLATFORM_ORDER = ['spotify', 'youtube', 'instagram', 'soundcloud', 'vk', 'yandex'];

  const PLATFORM_META = {
    spotify: {
      name: 'Spotify',
      color: '#1db954',
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.6 14.4c-.2.3-.5.4-.8.2-2.2-1.3-5-1.7-8.3-.9-.3.1-.6-.1-.7-.4-.1-.3.1-.6.4-.7 3.6-.9 6.7-.4 9.2 1.2.3.1.4.4.2.6zm1.2-2.7c-.2.4-.7.5-1 .3-2.5-1.5-6.3-2-9.3-1.1-.4.1-.8-.1-.9-.5-.1-.4.1-.8.5-.9 3.4-.9 7.6-.4 10.5 1.4.3.2.4.6.2.8zm.1-2.8c-3-1.8-8-2-10.9-.9-.5.2-1-.1-1.1-.5-.2-.5.1-1 .5-1.1 3.3-1.2 8.8-.9 12.3 1.2.4.3.6.8.3 1.2-.3.3-.8.5-1.1.1z"/></svg>'
    },
    youtube: {
      name: 'YouTube',
      color: '#ff0000',
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.8 8.001s-.2-1.4-.8-2c-.8-.9-1.6-.9-2-1-2.8-.2-7-.2-7-.2s-4.2 0-7 .2c-.4.1-1.2.1-2 1-.6.6-.8 2-.8 2S2 9.6 2 11.2v1.6c0 1.6.2 3.2.2 3.2s.2 1.4.8 2c.8.9 1.8.8 2.2.9 1.6.2 6.8.2 6.8.2s4.2 0 7-.2c.4-.1 1.2-.1 2-1 .6-.6.8-2 .8-2s.2-1.6.2-3.2v-1.6c0-1.6-.2-3.2-.2-3.2zM9.9 15.1V8.9l5.4 3.1-5.4 3.1z"/></svg>'
    },
    instagram: {
      name: 'Instagram',
      color: '#e1306c',
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.3 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .3-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.3-1-.4-2.2-.1-1.3-.1-1.7-.1-4.9s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.3 2.2-.4 1.3-.1 1.7-.1 4.9-.1M12 0C8.7 0 8.3 0 7 .1 5.7.2 4.9.4 4.2.7c-.8.3-1.4.7-2.1 1.4C1.4 2.8 1 3.4.7 4.2.4 4.9.2 5.7.1 7 0 8.3 0 8.7 0 12s0 3.7.1 5c.1 1.3.3 2.1.6 2.8.3.8.7 1.4 1.4 2.1.7.7 1.3 1.1 2.1 1.4.7.3 1.5.5 2.8.6C8.3 24 8.7 24 12 24s3.7 0 5-.1c1.3-.1 2.1-.3 2.8-.6.8-.3 1.4-.7 2.1-1.4.7-.7 1.1-1.3 1.4-2.1.3-.7.5-1.5.6-2.8.1-1.3.1-1.7.1-5s0-3.7-.1-5c-.1-1.3-.3-2.1-.6-2.8-.3-.8-.7-1.4-1.4-2.1C21.2 1.4 20.6 1 19.8.7c-.7-.3-1.5-.5-2.8-.6C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zM18.4 5.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8z"/></svg>'
    },
    soundcloud: {
      name: 'SoundCloud',
      color: '#ff5500',
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1.8 12.3c.2 0 .4-.1.5-.2l1.8-2.3v7.1c-.2.3-.5.5-.9.5-.5 0-.9-.4-.9-.9V13c0-.4.2-.7.5-.8zm3.2.5c.1-.1.3-.2.5-.2l1.3-1.7v6.2c-.1.3-.4.6-.8.6-.5 0-.9-.4-.9-.9v-3.4c0-.3.1-.5.4-.6zm3.1.5c.1-.1.3-.2.5-.2l1.1-1.4v5.4c-.1.3-.4.5-.7.5-.5 0-.9-.4-.9-.9v-2.8c0-.3.1-.5.4-.6zm3.1.4c.1-.1.3-.2.5-.2l.9-1.2v4.8c-.1.3-.4.5-.7.5-.5 0-.9-.4-.9-.9v-2.2c0-.3.1-.5.3-.6zm3 .4c.2-.1.4-.1.5-.1l.7-.9v4.2c-.1.3-.3.5-.7.5-.5 0-.9-.4-.9-.9v-1.8c0-.3.1-.5.4-.6zm3 .4c.2 0 .4-.1.5-.2l.5-.6v3.7c-.1.3-.3.5-.7.5-.5 0-.9-.4-.9-.9v-1.4c0-.3.1-.5.4-.6zm3 .4c.2 0 .4-.1.5-.2l.3-.4v3.1c-.1.3-.3.5-.7.5-.5 0-.9-.4-.9-.9v-1.1c0-.3.1-.5.4-.5zm3 .3c.2 0 .4-.1.5-.2l.2-.2v2.7c-.1.3-.3.5-.7.5-.5 0-.9-.4-.9-.9v-.8c0-.3.1-.5.4-.5z"/></svg>'
    },
    vk: {
      name: 'VK',
      color: '#4c75a3',
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.714-1.033-1.033-1.49-1.171-1.744-1.171-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4 8.594 4 8.194c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.814-.542 1.27-1.422 2.176-3.61 2.176-3.61.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z"/></svg>'
    },
    yandex: {
      name: 'Yandex Music',
      color: '#ffcc00',
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.16 2.5h-2.8v9.9L6.2 2.5H3.1l4.1 9.8-4.2 9.2h3.1l3.2-7.2 3.2 7.2h3.1l-4.2-9.2 4.1-9.8h-3.1l-3.16 9.9V2.5zM17.5 2.5v19h2.8v-19h-2.8z"/></svg>'
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // LINK VALIDATION & PLATFORM MANAGEMENT
  // CRM stores only URLs. Everything else is derived here.
  // ─────────────────────────────────────────────────────────────────────────────
  const LinkValidator = {
    patterns: {
      spotify: /open\.spotify\.com\/artist\/[a-zA-Z0-9]+/i,
      youtube: /youtube\.com\/(c\/|channel\/|@|user\/)[a-zA-Z0-9_-]+/i,
      instagram: /instagram\.com\/[a-zA-Z0-9_.]+/i,
      soundcloud: /soundcloud\.com\/[a-zA-Z0-9_-]+/i,
      vk: /vk\.com\/[a-zA-Z0-9_.]+/i,
      yandex: /music\.yandex\.ru\/artist\/\d+/i
    },

    validate(platform, url) {
      if (!url || typeof url !== 'string') return false;
      return this.patterns[platform]?.test(url.trim()) || false;
    },

    extractId(platform, url) {
      if (!url || typeof url !== 'string') return null;
      const m = url.trim().match(this.patterns[platform]);
      return m ? m[0] : null;
    }
  };

  const PlatformManager = {
    getStatus(artist, platform) {
      const url = artist?.[platform];
      const valid = LinkValidator.validate(platform, url);
      return {
        platform,
        url: url || '',
        connected: Boolean(url && valid),
        invalid: Boolean(url && !valid),
        missing: !url,
        extractedId: LinkValidator.extractId(platform, url)
      };
    },

    getAllStatuses(artist) {
      return PLATFORM_ORDER.map(p => this.getStatus(artist, p));
    }
  };

  function createProviderMeta(provider, collectionMethod, dataSource = 'Public Artist Page', overrides = {}) {
    return {
      provider,
      dataSource,
      collectionMethod,
      status: 'success',
      error: null,
      lastUpdated: new Date().toISOString(),
      duration: 0,
      parsedFields: [],
      missingFields: [],
      rawValues: null,
      ...overrides
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PROVIDERS
  // Each provider returns a normalized snapshot. No UI logic here.
  // Future API integrations replace these stubs without touching the UI.
  // ─────────────────────────────────────────────────────────────────────────────
  class BaseProvider {
    constructor(name) {
      this.name = name;
    }

    async fetch(artist) {
      throw new Error(`Provider ${this.name} must implement fetch()`);
    }

    _rng(artist) {
      const status = PlatformManager.getStatus(artist, this.name);
      return createSeededRandom(hashString(
        (artist?.id || 'unknown') + '|' +
        (status.extractedId || '') + '|' +
        this.name + '|' +
        (artist?.bookingFee || artist?.price || '') + '|' +
        (artist?.genre || '') + '|' +
        (artist?.country || '')
      ));
    }
  }

  class SpotifyProvider extends BaseProvider {
    constructor() { super('spotify'); }
    async fetch(artist) {
      const status = PlatformManager.getStatus(artist, 'spotify');
      const rng = this._rng(artist);
      const followers = status.connected ? estimatePlatformFollowers(artist, 'spotify', rng) : 0;
      const popularity = status.connected ? randBetween(rng, 35, 98) : 0;
      const release = status.connected ? randomRecentRelease(rng) : null;
      return {
        provider: 'spotify',
        status,
        followers,
        followersGrowth: status.connected ? randFloat(rng, -2, 12) : 0,
        popularity,
        popularityTrend: status.connected ? randFloat(rng, -3, 8) : 0,
        latestRelease: release?.title || null,
        releaseDate: release?.date || null,
        meta: createProviderMeta('spotify', 'CRM Estimation (placeholder)')
      };
    }
  }

  class YouTubeProvider extends BaseProvider {
    constructor() { super('youtube'); }
    async fetch(artist) {
      const status = PlatformManager.getStatus(artist, 'youtube');
      const rng = this._rng(artist);
      const followers = status.connected ? estimatePlatformFollowers(artist, 'youtube', rng) : 0;
      const popularity = status.connected ? randBetween(rng, 30, 95) : 0;
      const release = status.connected ? randomRecentRelease(rng) : null;
      return {
        provider: 'youtube',
        status,
        followers,
        followersGrowth: status.connected ? randFloat(rng, -2, 10) : 0,
        popularity,
        popularityTrend: status.connected ? randFloat(rng, -3, 7) : 0,
        latestRelease: release?.title || null,
        releaseDate: release?.date || null,
        meta: createProviderMeta('youtube', 'CRM Estimation (placeholder)')
      };
    }
  }

  class InstagramProvider extends BaseProvider {
    constructor() { super('instagram'); }
    async fetch(artist) {
      const status = PlatformManager.getStatus(artist, 'instagram');
      const rng = this._rng(artist);
      const followers = status.connected ? estimatePlatformFollowers(artist, 'instagram', rng) : 0;
      const popularity = status.connected ? randBetween(rng, 25, 90) : 0;
      const release = status.connected ? randomRecentRelease(rng) : null;
      return {
        provider: 'instagram',
        status,
        followers,
        followersGrowth: status.connected ? randFloat(rng, -2, 14) : 0,
        popularity,
        popularityTrend: status.connected ? randFloat(rng, -4, 9) : 0,
        latestRelease: release?.title || null,
        releaseDate: release?.date || null,
        meta: createProviderMeta('instagram', 'CRM Estimation (placeholder)')
      };
    }
  }

  class SoundCloudProvider extends BaseProvider {
    constructor() { super('soundcloud'); }
    async fetch(artist) {
      const status = PlatformManager.getStatus(artist, 'soundcloud');
      const rng = this._rng(artist);
      const followers = status.connected ? estimatePlatformFollowers(artist, 'soundcloud', rng) : 0;
      const popularity = status.connected ? randBetween(rng, 20, 85) : 0;
      const release = status.connected ? randomRecentRelease(rng) : null;
      return {
        provider: 'soundcloud',
        status,
        followers,
        followersGrowth: status.connected ? randFloat(rng, -3, 11) : 0,
        popularity,
        popularityTrend: status.connected ? randFloat(rng, -4, 8) : 0,
        latestRelease: release?.title || null,
        releaseDate: release?.date || null,
        meta: createProviderMeta('soundcloud', 'CRM Estimation (placeholder)')
      };
    }
  }

  class VKProvider extends BaseProvider {
    constructor() { super('vk'); }
    async fetch(artist) {
      const status = PlatformManager.getStatus(artist, 'vk');
      const rng = this._rng(artist);
      const followers = status.connected ? estimatePlatformFollowers(artist, 'vk', rng) : 0;
      const popularity = status.connected ? randBetween(rng, 25, 88) : 0;
      const release = status.connected ? randomRecentRelease(rng) : null;
      return {
        provider: 'vk',
        status,
        followers,
        followersGrowth: status.connected ? randFloat(rng, -2, 9) : 0,
        popularity,
        popularityTrend: status.connected ? randFloat(rng, -3, 6) : 0,
        latestRelease: release?.title || null,
        releaseDate: release?.date || null,
        meta: createProviderMeta('vk', 'CRM Estimation (placeholder)')
      };
    }
  }

  class YandexMusicProvider extends BaseProvider {
    constructor() { super('yandex'); }

    async fetch(artist) {
      const status = PlatformManager.getStatus(artist, 'yandex');
      const rng = this._rng(artist);
      const followers = status.connected ? estimatePlatformFollowers(artist, 'yandex', rng) : 0;
      const popularity = status.connected ? randBetween(rng, 35, 98) : 0;
      const release = status.connected ? randomRecentRelease(rng) : null;
      return {
        provider: 'yandex',
        status,
        followers,
        followersGrowth: status.connected ? randFloat(rng, -2, 9) : 0,
        popularity,
        popularityTrend: status.connected ? randFloat(rng, -3, 6) : 0,
        latestRelease: release?.title || null,
        releaseDate: release?.date || null,
        meta: createProviderMeta('yandex', 'Headless Browser (Playwright) - not yet integrated')
      };
    }
  }

  const Providers = [
    new SpotifyProvider(),
    new YouTubeProvider(),
    new InstagramProvider(),
    new SoundCloudProvider(),
    new VKProvider(),
    new YandexMusicProvider()
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // NORMALIZED ANALYTICS MODEL
  // One internal model. UI does not depend on provider source.
  // ─────────────────────────────────────────────────────────────────────────────
  function buildNormalizedModel(artist, providerResults) {
    const now = new Date().toISOString();
    const platforms = {};

    providerResults.forEach(r => {
      platforms[r.provider] = {
        provider: r.provider,
        name: PLATFORM_META[r.provider].name,
        status: r.status,
        connected: r.status.connected,
        invalid: r.status.invalid,
        missing: r.status.missing,
        url: r.status.url,
        extractedId: r.status.extractedId,
        followers: r.followers,
        followersGrowth: r.followersGrowth,
        popularity: r.popularity,
        popularityTrend: r.popularityTrend,
        latestRelease: r.latestRelease,
        releaseDate: r.releaseDate,
        daysSinceRelease: daysSince(r.releaseDate),
        lastUpdated: now,
        yandex: r.yandex || null,
        meta: r.meta || createProviderMeta(r.provider, 'Unknown')
      };
    });

    const connected = Object.values(platforms).filter(p => p.connected);
    const totalFollowers = connected.reduce((sum, p) => sum + p.followers, 0);
    const avgFollowersGrowth = connected.length
      ? connected.reduce((sum, p) => sum + p.followersGrowth, 0) / connected.length
      : 0;
    const avgPopularity = connected.length
      ? connected.reduce((sum, p) => sum + p.popularity, 0) / connected.length
      : 0;
    const avgPopularityTrend = connected.length
      ? connected.reduce((sum, p) => sum + p.popularityTrend, 0) / connected.length
      : 0;

    const latestRelease = connected
      .filter(p => p.releaseDate)
      .sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate))[0] || null;

    const yandexData = platforms.yandex?.yandex || null;

    return {
      artistId: artist?.id,
      lastUpdated: now,
      platforms,
      summary: {
        totalFollowers,
        avgFollowersGrowth,
        avgPopularity,
        avgPopularityTrend,
        latestRelease,
        daysSinceRelease: latestRelease?.daysSinceRelease || null,
        connectedCount: connected.length,
        platformCount: providerResults.length,
        yandex: yandexData,
        // Populated by AnalyticsService after history is built:
        followersChange7d: 0,
        followersChange30d: 0,
        popularityChange: 0,
        audienceGrowthTrend: 'stable',
        momentumScore: 0,
        momentumLabel: 'Neutral',
        momentumReasons: [],
        aiInsight: '',
        releaseTimeline: [],
        isGrowing: false,
        goodTimeToBook: false
      }
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // HISTORY STORE
  // Every update appends a snapshot. Never overwrites previous values.
  // ─────────────────────────────────────────────────────────────────────────────
  const HistoryStore = {
    key(artistId) {
      return `ai_history_${artistId}`;
    },

    load(artistId) {
      try {
        return JSON.parse(localStorage.getItem(this.key(artistId)) || '[]');
      } catch (e) {
        return [];
      }
    },

    save(artistId, history) {
      localStorage.setItem(this.key(artistId), JSON.stringify(history));
    },

    append(artistId, snapshot) {
      const history = this.load(artistId);
      history.push(snapshot);
      this.save(artistId, history);
      return history;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SYNTHETIC HISTORY & TREND HELPERS
  // Generate backfilled history so charts and change metrics work from day one.
  // ─────────────────────────────────────────────────────────────────────────────
  function generateSyntheticHistory(artistId, analytics) {
    const days = 30;
    const existing = HistoryStore.load(artistId);
    if (existing.length >= days) return;

    const endDate = new Date();
    const s = analytics.summary;

    if (s.totalFollowers > 0) {
      const startFollowers = Math.floor(s.totalFollowers / Math.max(1.01, 1 + (s.avgFollowersGrowth / 100)));
      const startPopularity = clamp(s.avgPopularity - s.avgPopularityTrend, 0, 100);
      for (let i = 0; i < days; i++) {
        const t = i / (days - 1);
        const date = new Date(endDate);
        date.setDate(date.getDate() - (days - 1 - i));
        const f = Math.floor(startFollowers + (s.totalFollowers - startFollowers) * t);
        const p = Math.round(startPopularity + (s.avgPopularity - startPopularity) * t);
        HistoryStore.append(artistId, {
          date: date.toISOString(),
          provider: 'summary',
          followers: f,
          popularity: p,
          latestRelease: s.latestRelease?.latestRelease || null,
          releaseDate: s.latestRelease?.releaseDate || null
        });
      }
    }

    Object.values(analytics.platforms).forEach(p => {
      if (!p.connected || p.followers === 0) return;
      const startFollowers = Math.floor(p.followers / Math.max(1.01, 1 + (p.followersGrowth / 100)));
      const startPopularity = clamp(p.popularity - p.popularityTrend, 0, 100);
      for (let i = 0; i < days; i++) {
        const t = i / (days - 1);
        const date = new Date(endDate);
        date.setDate(date.getDate() - (days - 1 - i));
        const f = Math.floor(startFollowers + (p.followers - startFollowers) * t);
        const pop = Math.round(startPopularity + (p.popularity - startPopularity) * t);
        HistoryStore.append(artistId, {
          date: date.toISOString(),
          provider: p.provider,
          followers: f,
          popularity: pop,
          latestRelease: p.latestRelease,
          releaseDate: p.releaseDate
        });
      }
    });
  }

  function calculateChange(history, provider, days, key) {
    const providerHistory = history.filter(h => h.provider === provider);
    if (providerHistory.length < 2) return 0;
    const now = providerHistory[providerHistory.length - 1];
    const past = providerHistory.find(h => {
      const d = (new Date(now.date) - new Date(h.date)) / (1000 * 60 * 60 * 24);
      return d >= days;
    });
    if (!past || !now[key] || !past[key]) return 0;
    return ((now[key] - past[key]) / past[key]) * 100;
  }

  function buildReleaseTimeline(analytics) {
    const map = new Map();
    Object.values(analytics.platforms).forEach(p => {
      if (!p.latestRelease || !p.releaseDate) return;
      const key = `${p.latestRelease}|${p.releaseDate}`;
      if (!map.has(key)) {
        map.set(key, {
          title: p.latestRelease,
          date: p.releaseDate,
          daysSince: daysSince(p.releaseDate),
          providers: []
        });
      }
      map.get(key).providers.push(p.provider);
    });
    return Array.from(map.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SCORING ENGINE
  // Configurable weighted momentum score for booking decisions.
  // ─────────────────────────────────────────────────────────────────────────────
  const ScoringEngine = {
    weights: {
      followersGrowth: 0.35,
      popularityChange: 0.25,
      releaseFreshness: 0.15,
      releaseFrequency: 0.10,
      socialActivity: 0.15
    },

    setWeights(weights) {
      this.weights = { ...this.weights, ...weights };
    },

    calculateMomentum(s) {
      const followersGrowthScore = clamp((s.followersChange30d + 50) / 100 * 100, 0, 100);
      const popularityChangeScore = clamp((s.popularityChange + 50) / 100 * 100, 0, 100);
      const releaseFreshnessScore = s.daysSinceRelease !== null
        ? clamp(100 - (s.daysSinceRelease / 90) * 100, 0, 100)
        : 0;
      const releaseFrequencyScore = clamp(s.connectedCount * 20, 0, 100);
      const socialActivityScore = clamp((s.connectedCount / 6) * 100, 0, 100);

      const score =
        followersGrowthScore * this.weights.followersGrowth +
        popularityChangeScore * this.weights.popularityChange +
        releaseFreshnessScore * this.weights.releaseFreshness +
        releaseFrequencyScore * this.weights.releaseFrequency +
        socialActivityScore * this.weights.socialActivity;

      return clamp(Math.round(score), 0, 100);
    },

    label(score) {
      if (score >= 80) return 'Strong Growth';
      if (score >= 60) return 'Stable Growth';
      if (score >= 40) return 'Neutral';
      if (score >= 20) return 'Slowing';
      return 'Declining';
    },

    reasons(s) {
      const reasons = [];
      if (s.followersChange30d > 5) reasons.push('Followers are increasing');
      else if (s.followersChange30d < -2) reasons.push('Followers are decreasing');

      if (s.popularityChange > 3) reasons.push('Popularity is increasing');
      else if (s.popularityChange < -3) reasons.push('Popularity is decreasing');

      if (s.daysSinceRelease !== null && s.daysSinceRelease < 30) reasons.push('Recent release performed well');

      if (s.followersChange7d > s.followersChange30d / 4) reasons.push('Audience growth is accelerating');
      else if (s.followersChange7d < s.followersChange30d / 4) reasons.push('Audience growth is decelerating');

      if (reasons.length === 0) {
        reasons.push(s.isGrowing ? 'Audience is growing steadily' : 'Audience is stable');
      }
      return reasons;
    }
  };

  function recoverProviderFromHistory(artistId, providerResult) {
    if (providerResult.meta.status === 'success') return providerResult;
    if (!providerResult.status.connected) return providerResult;

    const history = HistoryStore.load(artistId);
    const last = history.filter(h => h.provider === providerResult.provider).pop();
    if (!last) return providerResult;

    return {
      ...providerResult,
      followers: last.followers,
      popularity: last.popularity,
      latestRelease: last.latestRelease,
      releaseDate: last.releaseDate,
      yandex: last.yandex || null,
      meta: {
        ...providerResult.meta,
        status: 'stale',
        lastUpdated: last.date,
        error: providerResult.meta.error
      }
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ANALYTICS SERVICE
  // Orchestrates providers. UI talks only to this service.
  // ─────────────────────────────────────────────────────────────────────────────
  window.AnalyticsService = {
    cacheKey(artistId) {
      return `ai_cache_${artistId}`;
    },

    loadCache(artistId) {
      try {
        const raw = localStorage.getItem(this.cacheKey(artistId));
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    saveCache(artistId, analytics) {
      localStorage.setItem(this.cacheKey(artistId), JSON.stringify(analytics));
    },

    invalidateCache(artistId) {
      localStorage.removeItem(this.cacheKey(artistId));
    },

    async getArtistAnalytics(artist, forceRefresh = false) {
      const artistId = artist?.id || 'unknown';
      const cached = !forceRefresh && this.loadCache(artistId);
      if (cached && cached.lastUpdated && !forceRefresh) {
        const ageHours = (Date.now() - new Date(cached.lastUpdated).getTime()) / (1000 * 60 * 60);
        if (ageHours < 24) {
          cached.cached = true;
          return cached;
        }
      }

      const rawResults = await Promise.all(Providers.map(p => p.fetch(artist)));
      // Recover failed providers from previous history so we never lose valid data
      const results = rawResults.map(r => recoverProviderFromHistory(artistId, r));

      const connectedResults = results.filter(r => r.status.connected);
      const allConnectedFailed = connectedResults.length > 0 && connectedResults.every(r => r.meta.status === 'error');

      // If every connected provider failed and we have cached data, return the previous cache
      if (allConnectedFailed && cached) {
        cached.cached = true;
        cached.hasStaleData = true;
        cached.staleProviders = connectedResults.map(r => ({ provider: r.provider, error: r.meta.error }));
        return cached;
      }

      const analytics = buildNormalizedModel(artist, results);
      analytics.hasStaleData = connectedResults.some(r => r.meta.status === 'stale');
      analytics.staleProviders = connectedResults
        .filter(r => r.meta.status === 'stale')
        .map(r => ({ provider: r.provider, error: r.meta.error }));
      analytics.failedProviders = connectedResults
        .filter(r => r.meta.status === 'error')
        .map(r => ({ provider: r.provider, error: r.meta.error }));

      // Backfill history so charts and trends work from day one
      generateSyntheticHistory(artistId, analytics);

      // Summary snapshot (only if we have connected providers)
      if (analytics.summary.connectedCount > 0) {
        HistoryStore.append(artistId, {
          date: analytics.lastUpdated,
          provider: 'summary',
          followers: analytics.summary.totalFollowers,
          popularity: analytics.summary.avgPopularity,
          latestRelease: analytics.summary.latestRelease?.latestRelease || null,
          releaseDate: analytics.summary.latestRelease?.releaseDate || null
        });
      }

      // Per-provider snapshots: skip hard errors so we never overwrite valid data with empty values
      results.forEach(r => {
        if (r.status.connected && r.meta.status !== 'error') {
          const snapshot = {
            date: analytics.lastUpdated,
            provider: r.provider,
            followers: r.followers,
            popularity: r.popularity,
            latestRelease: r.latestRelease,
            releaseDate: r.releaseDate,
            meta: r.meta
          };
          if (r.provider === 'yandex' && r.yandex) {
            snapshot.yandex = r.yandex;
          }
          HistoryStore.append(artistId, snapshot);
        }
      });

      analytics.history = HistoryStore.load(artistId);

      // Enrich summary with trends, scoring, release timeline and AI insight
      const s = analytics.summary;
      s.followersChange7d = calculateChange(analytics.history, 'summary', 7, 'followers');
      s.followersChange30d = calculateChange(analytics.history, 'summary', 30, 'followers');
      s.popularityChange = calculateChange(analytics.history, 'summary', 30, 'popularity');
      s.audienceGrowthTrend = s.followersChange30d > 5 ? 'accelerating' : s.followersChange30d > 0 ? 'growing' : s.followersChange30d > -3 ? 'stable' : 'declining';
      s.isGrowing = s.followersChange30d > 0;
      s.releaseTimeline = buildReleaseTimeline(analytics);
      s.momentumScore = ScoringEngine.calculateMomentum(s);
      s.momentumLabel = ScoringEngine.label(s.momentumScore);
      s.momentumReasons = ScoringEngine.reasons(s);
      s.goodTimeToBook = s.momentumScore >= 70 && s.followersChange30d > 0;
      s.aiInsight = generateAiInsight(s, analytics.history);

      this.saveCache(artistId, analytics);
      analytics.cached = false;
      return analytics;
    }
  };

  function generateAiInsight(s, history) {
    const insights = [];

    if (s.releaseTimeline?.length && s.daysSinceRelease !== null && s.daysSinceRelease < 30 && s.followersChange30d > 5) {
      insights.push('The latest release resulted in noticeable follower growth.');
    }
    if (s.followersChange30d > 10) insights.push('Audience growth has accelerated during the last month.');
    if (s.followersChange30d < -5) insights.push('Audience growth has slowed during the last month.');
    if (Math.abs(s.followersChange30d) < 2) insights.push('Popularity remains stable.');

    const yandexHistory = history.filter(h => h.provider === 'yandex' && h.yandex);
    if (yandexHistory.length >= 2 && s.yandex) {
      const now = yandexHistory[yandexHistory.length - 1].yandex;
      const past = yandexHistory[0].yandex;

      if (now.monthly_plays && past.monthly_plays && now.monthly_plays > past.monthly_plays) {
        insights.push('Monthly plays increased.');
      } else if (now.monthly_plays && past.monthly_plays && now.monthly_plays < past.monthly_plays) {
        insights.push('Monthly plays decreased.');
      }

      if (now.ratings?.month && past.ratings?.month && now.ratings.month > past.ratings.month) {
        insights.push('Artist rating improved.');
      } else if (now.ratings?.month && past.ratings?.month && now.ratings.month < past.ratings.month) {
        insights.push('Artist rating declined.');
      }
    }

    if (s.yandex?.latest_release_date) {
      const days = daysSince(s.yandex.latest_release_date);
      insights.push(`Latest release was published ${days} days ago.`);
    }

    if (s.yandex?.release_frequency !== null && s.yandex?.release_frequency !== undefined && s.yandex.release_frequency < 1) {
      insights.push('Release frequency has slowed.');
    }

    if (insights.length === 0) {
      return 'No measurable release impact detected.';
    }
    return insights.join(' ');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SVG CHART COMPONENTS
  // ─────────────────────────────────────────────────────────────────────────────
  function areaSparklineSVG(data, color = '#3b82f6', height = 60) {
    if (!data || data.length < 2) return '';
    const width = 100;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const area = `0,${height} ` + points.join(' ') + ` ${width},${height}`;
    return `
      <svg viewBox="0 0 ${width} ${height}" class="ai-chart" preserveAspectRatio="none">
        <polygon fill="${color}" fill-opacity="0.15" points="${area}"/>
        <polyline fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${points.join(' ')}"/>
      </svg>`;
  }

  function donutChart(percent, color = '#3b82f6', size = 120, stroke = 10) {
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" class="ai-donut">
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="${stroke}"/>
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${color}" stroke-width="${stroke}"
          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round"
          transform="rotate(-90 ${size / 2} ${size / 2})"/>
        <text x="50%" y="50%" dy="0.1em" text-anchor="middle" class="ai-donut-text">${percent}</text>
      </svg>`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SECTION RENDERERS
  // ─────────────────────────────────────────────────────────────────────────────
  function statCard(label, value, change, sublabel = '') {
    return `
      <div class="ai-stat-card">
        <div class="ai-stat-label">${label}</div>
        <div class="ai-stat-value">${value}</div>
        ${change !== undefined ? `<div class="ai-stat-change">${trendIndicator(change)}</div>` : ''}
        ${sublabel ? `<div class="ai-stat-sublabel">${sublabel}</div>` : ''}
      </div>`;
  }

  function chartCard(title, chartHtml, footer = '') {
    return `
      <div class="ai-card">
        <div class="ai-card-header">${title}</div>
        <div class="ai-card-body">${chartHtml}</div>
        ${footer ? `<div class="ai-card-footer">${footer}</div>` : ''}
      </div>`;
  }

  function sectionHeader(title, meta = '') {
    return `<div class="ai-section-header"><h3>${title}</h3>${meta ? `<div class="ai-section-meta">${meta}</div>` : ''}</div>`;
  }

  function platformIcon(platform) {
    return `<span class="ai-platform-icon" style="color:${PLATFORM_META[platform].color}">${PLATFORM_META[platform].icon}</span>`;
  }

  function platformStatusText(status) {
    if (status.connected) return '✓ Connected';
    if (status.invalid) return '⚠ Invalid link';
    return '○ Not specified';
  }

  function generateHistorySeries(history, provider, key) {
    const values = history
      .filter(h => h.provider === provider)
      .map(h => h[key])
      .filter(v => typeof v === 'number');
    return values.length >= 2 ? values : null;
  }

  function getYandexMetricSeries(history, key) {
    return history
      .filter(h => h.provider === 'yandex' && h.yandex && typeof h.yandex[key] === 'number')
      .map(h => h.yandex[key]);
  }

  function getYandexRatingsSeries(history, key) {
    return history
      .filter(h => h.provider === 'yandex' && h.yandex?.ratings && typeof h.yandex.ratings[key] === 'number')
      .map(h => h.yandex.ratings[key]);
  }

  function renderUpdateBar(data) {
    const lastUpdated = data.lastUpdated;
    const staleProviders = data.staleProviders || [];
    const failedProviders = data.failedProviders || [];
    const hasIssue = staleProviders.length > 0 || failedProviders.length > 0;

    let staleMessage = '';
    if (hasIssue) {
      const staleDates = Object.values(data.platforms)
        .filter(p => p.connected && (p.meta.status === 'stale' || p.meta.status === 'error'))
        .map(p => p.meta.lastUpdated)
        .filter(Boolean);
      const oldestDate = staleDates.length
        ? new Date(Math.min(...staleDates.map(d => new Date(d).getTime())))
        : null;
      staleMessage = oldestDate
        ? `⚠ Last update failed. Showing data collected ${formatDate(oldestDate)}.`
        : '⚠ Last update failed. Showing previously collected data.';
    }

    return `
      <div class="ai-update-bar">
        <div class="ai-update-info">
          <span class="ai-dot ${hasIssue ? 'ai-dot-warning' : 'ai-dot-active'}"></span>
          <span>Last Updated: ${formatDate(lastUpdated)}</span>
        </div>
        ${hasIssue ? `<div class="ai-stale-warning">${staleMessage}</div>` : ''}
      </div>`;
  }

  function renderYandexMetrics(s, history) {
    const yandex = s.yandex;
    if (!yandex) return '';

    const cards = [];
    if (yandex.popularity !== null && yandex.popularity !== undefined) {
      cards.push(statCard('Yandex Popularity', yandex.popularity.toFixed(1), undefined));
    }
    if (yandex.ratings?.month !== null && yandex.ratings?.month !== undefined) {
      cards.push(statCard('Yandex Rating (Month)', yandex.ratings.month.toFixed(1), undefined));
    }
    if (yandex.ratings?.week !== null && yandex.ratings?.week !== undefined) {
      cards.push(statCard('Yandex Rating (Week)', yandex.ratings.week.toFixed(1), undefined));
    }
    if (yandex.release_frequency !== null && yandex.release_frequency !== undefined) {
      cards.push(statCard('Release Frequency', yandex.release_frequency.toFixed(1) + '/year', undefined));
    }
    if (yandex.monthly_plays !== null && yandex.monthly_plays !== undefined) {
      cards.push(statCard('Monthly Plays', formatNumber(yandex.monthly_plays), undefined));
    }
    if (yandex.monthly_listeners !== null && yandex.monthly_listeners !== undefined) {
      cards.push(statCard('Monthly Listeners', formatNumber(yandex.monthly_listeners), undefined));
    }

    const charts = [];
    const popSeries = getYandexMetricSeries(history, 'popularity');
    if (popSeries.length >= 2) {
      charts.push(chartCard('Yandex Popularity History', areaSparklineSVG(popSeries, '#ffcc00', 120)));
    }
    ['month', 'week', 'day'].forEach(key => {
      const series = getYandexRatingsSeries(history, key);
      if (series.length >= 2) {
        charts.push(chartCard(`Yandex Rating (${key})`, areaSparklineSVG(series, '#ffcc00', 120)));
      }
    });

    if (cards.length === 0 && charts.length === 0) return '';

    return `
      <div class="ai-section">
        ${sectionHeader('Yandex Music Metrics')}
        ${cards.length ? `<div class="ai-grid ai-cols-4">${cards.join('')}</div>` : ''}
        ${charts.length ? `<div class="ai-grid ai-cols-2">${charts.join('')}</div>` : ''}
      </div>`;
  }

  function renderKPIs(s) {
    return `
      <div class="ai-section">
        ${sectionHeader('KPI')}
        <div class="ai-grid ai-cols-4">
          ${statCard('Followers', formatNumber(s.totalFollowers), s.followersChange30d)}
          ${statCard('Followers Change (7d)', formatPercent(s.followersChange7d), s.followersChange7d)}
          ${statCard('Followers Change (30d)', formatPercent(s.followersChange30d), s.followersChange30d)}
          ${statCard('Audience Growth Trend', s.audienceGrowthTrend, s.followersChange30d)}
          ${statCard('Popularity Score', s.avgPopularity.toFixed(1) + '/100', s.popularityChange)}
          ${statCard('Popularity Change', formatPercent(s.popularityChange), s.popularityChange)}
          ${statCard('Latest Release', escapeHtml(s.latestRelease?.latestRelease) || '—', undefined, s.latestRelease?.releaseDate ? formatDate(s.latestRelease.releaseDate) : '')}
          ${statCard('Days Since Release', s.daysSinceRelease !== null ? s.daysSinceRelease + ' days' : '—', undefined)}
        </div>
      </div>`;
  }

  function renderMomentumScore(s) {
    const color = s.momentumScore >= 80 ? '#10b981' : s.momentumScore >= 60 ? '#3b82f6' : s.momentumScore >= 40 ? '#f59e0b' : '#ef4444';
    return `
      <div class="ai-section">
        ${sectionHeader('Momentum Score')}
        <div class="ai-momentum-card">
          <div class="ai-momentum-chart">${donutChart(s.momentumScore, color, 160, 14)}</div>
          <div class="ai-momentum-info">
            <div class="ai-momentum-value">${s.momentumScore}</div>
            <div class="ai-momentum-label" style="color:${color}">${s.momentumLabel}</div>
            <ul class="ai-momentum-reasons">
              ${s.momentumReasons.map(r => `<li>${r}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>`;
  }

  function renderAiInsight(s) {
    return `
      <div class="ai-section">
        ${sectionHeader('AI Insight')}
        <div class="ai-card">
          <div class="ai-card-body">
            <div class="ai-insight">${escapeHtml(s.aiInsight)}</div>
          </div>
        </div>
      </div>`;
  }

  function renderGlobalCharts(history) {
    const followersSeries = generateHistorySeries(history, 'summary', 'followers');
    const popularitySeries = generateHistorySeries(history, 'summary', 'popularity');
    return `
      <div class="ai-section">
        ${sectionHeader('Trends')}
        <div class="ai-grid ai-cols-2">
          ${chartCard('Followers History', followersSeries ? areaSparklineSVG(followersSeries, '#3b82f6', 120) : '<div class="ai-platform-empty">Insufficient data</div>')}
          ${chartCard('Popularity History', popularitySeries ? areaSparklineSVG(popularitySeries, '#8b5cf6', 120) : '<div class="ai-platform-empty">Insufficient data</div>')}
        </div>
      </div>`;
  }

  function renderReleaseTimeline(timeline) {
    if (!timeline || timeline.length === 0) return '';
    const rows = timeline.map(r => `
      <div class="ai-timeline-item">
        <div class="ai-timeline-dot"></div>
        <div class="ai-timeline-content">
          <div class="ai-timeline-title">${escapeHtml(r.title)}</div>
          <div class="ai-timeline-meta">${formatDate(r.date)} · ${r.daysSince} days ago · ${r.providers.map(p => PLATFORM_META[p].name).join(', ')}</div>
        </div>
      </div>
    `).join('');
    return `
      <div class="ai-section">
        ${sectionHeader('Release Timeline')}
        <div class="ai-card">
          <div class="ai-card-body ai-timeline">${rows}</div>
        </div>
      </div>`;
  }

  function renderPlatforms(platforms) {
    const cards = PLATFORM_ORDER.map(key => {
      const p = platforms[key];
      const meta = PLATFORM_META[key];
      const m = p.meta || {};
      const statusClass = m.status === 'success' ? 'ai-status-success' : m.status === 'stale' ? 'ai-status-stale' : m.status === 'error' ? 'ai-status-error' : 'ai-status-off';
      const statusIcon = m.status === 'success' ? '✓' : m.status === 'stale' ? '⚠' : m.status === 'error' ? '✗' : '—';
      const statusLabel = m.status === 'success' ? 'Success' : m.status === 'stale' ? 'Stale' : m.status === 'error' ? 'Failed' : 'Not configured';

      return `
        <div class="ai-platform-card ${p.connected ? 'ai-platform-connected' : p.invalid ? 'ai-platform-invalid' : 'ai-platform-missing'}">
          <div class="ai-platform-header">
            ${platformIcon(key)}
            <div class="ai-platform-name">${meta.name}</div>
            <div class="ai-platform-status" title="${p.connected ? 'Valid link' : p.invalid ? 'Invalid link' : 'Not specified'}">${platformStatusText(p.status)}</div>
          </div>
          ${p.connected ? `
          <div class="ai-platform-body">
            <div class="ai-platform-metrics">
              ${formatNumber(p.followers)} followers · ${p.popularity}/100 popularity
            </div>
            <div class="ai-platform-source">
              <div><strong>Source:</strong> ${m.dataSource || '—'}</div>
              <div><strong>Method:</strong> ${m.collectionMethod || '—'}</div>
              <div><strong>Updated:</strong> ${m.lastUpdated ? formatDate(m.lastUpdated) : '—'}</div>
              <div class="ai-platform-source-status ${statusClass}"><strong>Status:</strong> ${statusIcon} ${statusLabel}</div>
              ${m.error ? `<div class="ai-platform-error"><strong>Error:</strong> ${escapeHtml(m.error)}</div>` : ''}
            </div>
          </div>` : ''}
        </div>`;
    }).join('');
    return `
      <div class="ai-section">
        ${sectionHeader('Platform Status')}
        <div class="ai-platform-list">${cards}</div>
      </div>`;
  }

  function renderDebugPanel(data) {
    const isAdmin = window.__AI_ADMIN_MODE__ === true;
    if (!isAdmin) return '';

    const rows = PLATFORM_ORDER.map(key => {
      const p = data.platforms[key];
      const m = p.meta || {};
      return `
        <div class="ai-debug-row">
          <div class="ai-debug-provider">${PLATFORM_META[key].name}</div>
          <div class="ai-debug-status ai-status-${m.status}">${m.status}</div>
          <div class="ai-debug-field"><strong>Last refresh:</strong> ${m.lastUpdated ? formatDate(m.lastUpdated) : '—'}</div>
          <div class="ai-debug-field"><strong>Duration:</strong> ${m.duration ? m.duration + ' ms' : '—'}</div>
          <div class="ai-debug-field"><strong>Parsed:</strong> ${m.parsedFields?.join(', ') || '—'}</div>
          <div class="ai-debug-field"><strong>Missing:</strong> ${m.missingFields?.join(', ') || '—'}</div>
          <div class="ai-debug-field"><strong>Error:</strong> ${m.error ? escapeHtml(m.error) : '—'}</div>
          ${m.rawValues ? `<details class="ai-debug-raw"><summary>Raw parsed values</summary><pre>${escapeHtml(JSON.stringify(m.rawValues, null, 2))}</pre></details>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div class="ai-section ai-debug-section">
        <details class="ai-debug-panel">
          <summary>Developer / Debug</summary>
          <div class="ai-debug-body">
            <div class="ai-debug-grid">${rows}</div>
          </div>
        </details>
      </div>
    `;
  }

  function renderHistory(history) {
    const rows = history.slice().reverse().slice(0, 10).map(h => `
      <div class="ai-history-row">
        <div class="ai-history-date">${formatDate(h.date)}</div>
        <div class="ai-history-provider">${h.provider}</div>
        <div class="ai-history-followers">${formatNumber(h.followers)}</div>
        <div class="ai-history-popularity">${h.popularity ? h.popularity.toFixed(1) : '-'}</div>
        <div class="ai-history-release">${h.latestRelease || '—'}</div>
      </div>
    `).join('');
    return `
      <div class="ai-section">
        ${sectionHeader('Update History', `<span class="ai-count">${history.length}</span>`)}
        <div class="ai-card">
          <div class="ai-card-body ai-history">
            <div class="ai-history-row ai-history-header">
              <div>Date</div><div>Source</div><div>Followers</div><div>Popularity</div><div>Release</div>
            </div>
            ${rows || '<div class="ai-history-empty">History is empty</div>'}
          </div>
        </div>
      </div>`;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN RENDERER
  // ─────────────────────────────────────────────────────────────────────────────
  window.renderArtistAnalytics = async function (artist) {
    const data = await window.AnalyticsService.getArtistAnalytics(artist);
    return `
      <div class="ai-analytics">
        ${renderUpdateBar(data)}
        ${renderKPIs(data.summary)}
        ${renderMomentumScore(data.summary)}
        ${renderAiInsight(data.summary)}
        ${renderYandexMetrics(data.summary, data.history)}
        ${renderGlobalCharts(data.history)}
        ${renderReleaseTimeline(data.summary.releaseTimeline)}
        ${renderPlatforms(data.platforms)}
        ${renderDebugPanel(data)}
        ${renderHistory(data.history)}
      </div>
    `;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC API FOR CRM & FUTURE INTEGRATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  window.LinkValidator = LinkValidator;
  window.PlatformManager = PlatformManager;
  window.PLATFORM_ORDER = PLATFORM_ORDER;
  window.PLATFORM_META = PLATFORM_META;
  window.HistoryStore = HistoryStore;
  window.ScoringEngine = ScoringEngine;
})();
