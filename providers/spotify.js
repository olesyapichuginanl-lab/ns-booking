import { PARSER_CONFIG } from './config.js';

const CONFIG = PARSER_CONFIG.spotify;
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS_BASE = 'https://accounts.spotify.com';

// Cache for access token
let cachedToken = null;
let tokenExpiry = null;

// Extract artist ID from Spotify URL
function extractArtistId(url) {
  const match = url.match(/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

// Get Spotify access token using Client Credentials Flow
async function getAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID || '1c28ccc3ab794e12ba47cfdb418c40ae';
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  if (!clientSecret) {
    throw new Error('SPOTIFY_CLIENT_SECRET environment variable is required');
  }
  
  // Check if cached token is still valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    console.log('SpotifyProvider: Using cached access token');
    return cachedToken;
  }
  
  console.log('SpotifyProvider: Requesting new access token');
  
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const response = await fetch(`${SPOTIFY_ACCOUNTS_BASE}/api/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 minute before expiry
  
  console.log('SpotifyProvider: Got new access token, expires in', data.expires_in, 'seconds');
  return cachedToken;
}

// Make authenticated request to Spotify API
async function spotifyApiRequest(endpoint) {
  const accessToken = await getAccessToken();
  
  const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Token might be expired, clear cache and retry once
      cachedToken = null;
      tokenExpiry = null;
      const newToken = await getAccessToken();
      
      const retryResponse = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!retryResponse.ok) {
        throw new Error(`Spotify API error: ${retryResponse.status} ${retryResponse.statusText}`);
      }
      
      return await retryResponse.json();
    }
    throw new Error(`Spotify API error: ${response.status} ${response.statusText}`);
  }
  
  return await response.json();
}

export async function collect(url) {
  console.log('SpotifyProvider: collect called with URL:', url);
  const start = Date.now();
  
  try {
    const artistId = extractArtistId(url);
    if (!artistId) {
      throw new Error('Invalid Spotify artist URL');
    }
    console.log('SpotifyProvider: Extracted artist ID:', artistId);

    // Fetch artist data
    console.log('SpotifyProvider: Fetching artist data from API');
    const artistData = await spotifyApiRequest(`/artists/${artistId}`);
    
    // Fetch artist's albums to get latest release
    console.log('SpotifyProvider: Fetching artist albums');
    const albumsData = await spotifyApiRequest(`/artists/${artistId}/albums?limit=1&include_groups=album,single&market=US`);
    
    // Extract metrics from API response
    const followers = artistData.followers?.total || null;
    const popularity = artistData.popularity || null;
    const artistName = artistData.name || null;
    
    // Get latest release
    const latestRelease = albumsData.items?.[0]?.name || null;
    const releaseDate = albumsData.items?.[0]?.release_date || null;
    
    // Note: Spotify Web API doesn't provide monthly listeners publicly
    // This metric is only available through Spotify for Artists
    const monthlyListeners = null;
    const monthlyPlays = null;
    const subscribers = null;

    const rawValues = { artistName, followers, monthlyListeners, popularity, latestRelease, releaseDate };
    const parsedFields = Object.keys(rawValues).filter(k => {
      const v = rawValues[k];
      return v !== null && v !== undefined;
    });

    if (parsedFields.length === 0) {
      throw new Error('No data available from Spotify API');
    }

    const result = {
      followers,
      subscribers,
      monthlyListeners,
      monthlyPlays,
      popularity,
      latestRelease,
      releaseDate,
      updatedAt: new Date().toISOString(),
      source: 'Spotify Web API',
      status: 'success',
      error: null,
      meta: {
        provider: 'spotify',
        dataSource: 'Spotify Web API',
        collectionMethod: 'REST API',
        duration: Date.now() - start,
        parsedFields,
        missingFields: ['monthlyListeners', 'monthlyPlays'], // These aren't available in public API
        rawValues,
      },
    };
    console.log('SpotifyProvider: Returning success result');
    return result;
  } catch (error) {
    console.log('FAIL: SpotifyProvider caught error:', error.message);
    return errorResult(start, error);
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
    source: 'Spotify Web API',
    status: 'error',
    error: error.message,
    meta: {
      provider: 'spotify',
      dataSource: 'Spotify Web API',
      collectionMethod: 'REST API',
      duration: Date.now() - start,
      parsedFields: [],
      missingFields: [],
      rawValues: null,
    },
  };
}
