// The scraper module lives outside the addon and is only present in full deployments.
// When the addon is deployed standalone (without the scraper directory) on-demand
// scraping is disabled and stream requests simply return whatever is in the database.
let scraperModule = null;
try {
  scraperModule = require('../../scraper/lib/onDemandScraper');
} catch (error) {
  console.log(`On-demand scraping disabled - scraper module not available: ${error.message}`);
}

/**
 * Triggers on-demand scraping for a specific IMDB ID
 * @param {string} imdbId - The IMDB ID to search for (e.g., 'tt4574334')
 * @param {string} contentType - Type of content (movie, series, or anime)
 * @returns {Promise<number>} Number of torrents found
 */
async function scrapeByImdbId(imdbId, contentType = 'movie') {
  if (!scraperModule) {
    return 0;
  }
  console.log(`[${new Date().toISOString()}] Triggering on-demand scrape for IMDB ID: ${imdbId} (type: ${contentType})`);

  try {
    const count = await scraperModule.scrapeByImdbId(imdbId, contentType);
    console.log(`[${new Date().toISOString()}] On-demand scrape complete for ${imdbId}: ${count} torrents found`);
    return count;
  } catch (error) {
    console.error(`Failed on-demand scrape for ${imdbId}:`, error.message);
    return 0;
  }
}

function isAvailable() {
  return !!scraperModule;
}

module.exports = {
  scrapeByImdbId,
  isAvailable
};
