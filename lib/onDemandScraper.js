const axios = require('axios');

// URL of an external scraper service exposing POST /on-demand.
// When not configured, on-demand scraping is disabled and stream requests
// simply return whatever is already in the database.
const SCRAPER_URL = process.env.SCRAPER_URL;
// Keep the wait below common proxy limits (e.g. Cloudflare cuts connections
// at 100s) - on timeout the scraper keeps working and results land in the
// database for subsequent requests.
const SCRAPE_TIMEOUT = parseInt(process.env.SCRAPE_TIMEOUT_MS || '60000', 10);

if (!SCRAPER_URL) {
  console.log('On-demand scraping disabled - SCRAPER_URL is not configured');
}

/**
 * Triggers on-demand scraping for a specific IMDB ID
 * @param {string} imdbId - The IMDB ID to search for (e.g., 'tt4574334')
 * @param {string} contentType - Type of content (movie, series, or anime)
 * @returns {Promise<number>} Number of torrents found
 */
async function scrapeByImdbId(imdbId, contentType = 'movie') {
  if (!SCRAPER_URL) {
    return 0;
  }
  console.log(`[${new Date().toISOString()}] Triggering on-demand scrape for IMDB ID: ${imdbId} (type: ${contentType})`);

  try {
    const response = await axios.post(`${SCRAPER_URL}/on-demand`,
        { imdbId, contentType },
        { timeout: SCRAPE_TIMEOUT });
    const count = response.data && response.data.count || 0;
    console.log(`[${new Date().toISOString()}] On-demand scrape complete for ${imdbId}: ${count} torrents found`);
    return count;
  } catch (error) {
    console.error(`Failed on-demand scrape for ${imdbId}:`, error.message);
    return 0;
  }
}

function isAvailable() {
  return !!SCRAPER_URL;
}

module.exports = {
  scrapeByImdbId,
  isAvailable
};
