/**
 * Centralized parser configuration for the headless scraping engine.
 * All selectors live in this single file. When a platform changes its HTML
 * layout, update the selectors here and the rest of the engine stays unchanged.
 */

export const PARSER_CONFIG = {
  spotify: {
    name: 'Spotify',
    source: 'Spotify Web API',
    method: 'REST API',
    domains: ['open.spotify.com'],
    accessToken: null, // Set via SPOTIFY_ACCESS_TOKEN environment variable
    selectors: {
      artistName: 'h1[data-testid="entity-title"]',
      followers: '[data-testid="stats-followers"]',
      monthlyListeners: '[data-testid="monthly-listeners"]',
      popularTracks: '[data-testid="track-row"]',
      latestRelease: '[data-testid="latest-release"] a',
      latestReleaseDate: '[data-testid="latest-release"] span',
    },
    fallbackSelectors: {
      followers: 'span[role="img"][aria-label*="followers"]',
      monthlyListeners: 'div:has-text("monthly listeners")',
    },
  },
  youtube: {
    name: 'YouTube',
    source: 'Public Channel Page',
    method: 'Rendered Page Parser',
    domains: ['youtube.com', 'www.youtube.com', 'youtu.be'],
    selectors: {
      channelName: '#channel-name',
      subscribers: '#subscriber-count',
      videoCount: '#videos-count',
      viewCount: '#view-count',
      latestVideo: '#video-title',
      latestVideoDate: '#metadata-line span',
    },
  },
  instagram: {
    name: 'Instagram',
    source: 'Public Profile Page',
    method: 'Rendered Page Parser',
    domains: ['instagram.com', 'www.instagram.com'],
    selectors: {
      profileName: 'header h2',
      followers: 'header section ul li span[title]',
      posts: 'header section ul li span',
      latestPost: 'article a',
      latestPostDate: 'time',
    },
  },
  soundcloud: {
    name: 'SoundCloud',
    source: 'Public Artist Page',
    method: 'Rendered Page Parser',
    domains: ['soundcloud.com'],
    selectors: {
      artistName: 'h1',
      followers: 'div:has-text("Followers")',
      tracks: 'div:has-text("Tracks")',
      latestTrack: '.soundList__item h2',
      latestTrackDate: 'time',
    },
  },
  vk: {
    name: 'VK',
    source: 'Public Group/Artist Page',
    method: 'Rendered Page Parser',
    domains: ['vk.com'],
    selectors: {
      name: 'h1',
      members: '.group_friends_count',
      latestPost: 'div.wall_text',
      latestPostDate: 'span.rel_date',
    },
  },
  yandex: {
    name: 'Yandex Music',
    source: 'Public Artist Page',
    method: 'Rendered Page Parser',
    domains: ['music.yandex.ru', 'music.yandex.com'],
    selectors: {
      artistName: '[class*="artist"][class*="title"], h1',
      followers: '[class*="followers"], [class*="subscribers"]',
      monthlyListeners: '[class*="monthly"], [class*="listeners"]',
      popularTracks: '[class*="track"]',
      latestRelease: '[class*="release"] a',
      latestReleaseDate: '[class*="release"] span',
    },
  },
};

export function detectProvider(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    for (const [key, config] of Object.entries(PARSER_CONFIG)) {
      if (config.domains.some(d => hostname === d || hostname.endsWith(`.${d}`))) {
        return key;
      }
    }
  } catch {
    return null;
  }
  return null;
}
