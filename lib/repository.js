const { Sequelize } = require('sequelize');
const Op = Sequelize.Op;
const onDemandScraper = require('./onDemandScraper');
const { invalidateStreamCache } = require('./cache');

const DATABASE_URI = process.env.DATABASE_URI;
const ENABLE_ON_DEMAND_SCRAPING = process.env.ENABLE_ON_DEMAND_SCRAPING !== 'false'; // enabled by default

const database = new Sequelize(DATABASE_URI, { logging: false });

const Torrent = database.define('torrent',
    {
      infoHash: { type: Sequelize.STRING(64), primaryKey: true },
      provider: { type: Sequelize.STRING(32), allowNull: false },
      torrentId: { type: Sequelize.STRING(128) },
      title: { type: Sequelize.STRING(256), allowNull: false },
      size: { type: Sequelize.BIGINT },
      type: { type: Sequelize.STRING(16), allowNull: false },
      uploadDate: { type: Sequelize.DATE, allowNull: false },
      seeders: { type: Sequelize.SMALLINT },
      trackers: { type: Sequelize.STRING(4096) },
      languages: { type: Sequelize.STRING(4096) },
      resolution: { type: Sequelize.STRING(16) }
    }
);

const File = database.define('file',
    {
      id: { type: Sequelize.BIGINT, autoIncrement: true, primaryKey: true },
      infoHash: {
        type: Sequelize.STRING(64),
        allowNull: false,
        references: { model: Torrent, key: 'infoHash' },
        onDelete: 'CASCADE'
      },
      fileIndex: { type: Sequelize.INTEGER },
      title: { type: Sequelize.STRING(256), allowNull: false },
      size: { type: Sequelize.BIGINT },
      imdbId: { type: Sequelize.STRING(32) },
      imdbSeason: { type: Sequelize.INTEGER },
      imdbEpisode: { type: Sequelize.INTEGER },
      kitsuId: { type: Sequelize.INTEGER },
      kitsuEpisode: { type: Sequelize.INTEGER }
    },
);

Torrent.hasMany(File, { foreignKey: 'infoHash', constraints: false });
File.belongsTo(Torrent, { foreignKey: 'infoHash', constraints: false });

function getTorrent(infoHash) {
  return Torrent.findOne({ where: { infoHash: infoHash } });
}

async function getImdbIdMovieEntries(imdbId) {
  const results = await File.findAll({
    where: {
      imdbId: { [Op.eq]: imdbId }
    },
    include: [Torrent],
    limit: 500,
    order: [
      [Torrent, 'seeders', 'DESC']
    ]
  });

  // If no results found and on-demand scraping is enabled, trigger scraping
  if (results.length === 0 && ENABLE_ON_DEMAND_SCRAPING) {
    console.log(`No results found for movie ${imdbId}, triggering on-demand scraping...`);
    try {
      await onDemandScraper.scrapeByImdbId(imdbId, 'movie');
      // Invalidate cache so fresh results are returned immediately
      await invalidateStreamCache(imdbId);

      // Query again after scraping
      return await File.findAll({
        where: {
          imdbId: { [Op.eq]: imdbId }
        },
        include: [Torrent],
        limit: 500,
        order: [
          [Torrent, 'seeders', 'DESC']
        ]
      });
    } catch (error) {
      console.error(`On-demand scraping failed for ${imdbId}:`, error.message);
    }
  }

  return results;
}

async function getImdbIdSeriesEntries(imdbId, season, episode) {
  const results = await File.findAll({
    where: {
      imdbId: { [Op.eq]: imdbId },
      imdbSeason: { [Op.eq]: season },
      imdbEpisode: { [Op.eq]: episode }
    },
    include: [Torrent],
    limit: 500,
    order: [
      [Torrent, 'seeders', 'DESC']
    ]
  });

  // If no results found and on-demand scraping is enabled, trigger scraping
  if (results.length === 0 && ENABLE_ON_DEMAND_SCRAPING) {
    console.log(`No results found for series ${imdbId} S${season}E${episode}, triggering on-demand scraping...`);
    try {
      await onDemandScraper.scrapeByImdbId(imdbId, 'series');
      // Invalidate cache so fresh results are returned immediately
      await invalidateStreamCache(`${imdbId}:${season}:${episode}`);

      // Query again after scraping
      return await File.findAll({
        where: {
          imdbId: { [Op.eq]: imdbId },
          imdbSeason: { [Op.eq]: season },
          imdbEpisode: { [Op.eq]: episode }
        },
        include: [Torrent],
        limit: 500,
        order: [
          [Torrent, 'seeders', 'DESC']
        ]
      });
    } catch (error) {
      console.error(`On-demand scraping failed for ${imdbId}:`, error.message);
    }
  }

  return results;
}

function getKitsuIdMovieEntries(kitsuId) {
  return File.findAll({
    where: {
      kitsuId: { [Op.eq]: kitsuId }
    },
    include: [Torrent],
    limit: 500,
    order: [
      [Torrent, 'seeders', 'DESC']
    ]
  });
}

function getKitsuIdSeriesEntries(kitsuId, episode) {
  return File.findAll({
    where: {
      kitsuId: { [Op.eq]: kitsuId },
      kitsuEpisode: { [Op.eq]: episode }
    },
    include: [Torrent],
    limit: 500,
    order: [
      [Torrent, 'seeders', 'DESC']
    ]
  });
}

module.exports = {
  getTorrent,
  getImdbIdMovieEntries,
  getImdbIdSeriesEntries,
  getKitsuIdMovieEntries,
  getKitsuIdSeriesEntries
};