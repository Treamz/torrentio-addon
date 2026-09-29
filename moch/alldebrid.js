const AllDebridClient = require('all-debrid-api');
const { Type } = require('../lib/types');
const { isVideo, isArchive } = require('../lib/extension');
const StaticResponse = require('./static');
const { getMagnetLink } = require('../lib/magnetHelper');

const KEY = 'alldebrid';
const AGENT = 'torrentio';

async function getCachedStreams(streams, apiKey) {
  // AllDebrid retired the magnet/instant endpoint (it now answers 404
  // "Endpoint doesn't exist"), and a failed availability check used to drop
  // every stream. Show all torrents instead and let AllDebrid download the
  // uncached ones on demand - same approach already used for RealDebrid.
  return streams.reduce((mochStreams, stream) => {
    const streamTitleParts = stream.title.replace(/\n👤.*/s, '').split('\n');
    const fileName = streamTitleParts[streamTitleParts.length - 1];
    const fileIndex = streamTitleParts.length === 2 ? stream.fileIdx : null;
    const encodedFileName = encodeURIComponent(fileName);
    mochStreams[stream.infoHash] = {
      url: `${apiKey}/${stream.infoHash}/${encodedFileName}/${fileIndex}`,
      cached: true
    };
    return mochStreams;
  }, {});
}

async function getCatalog(apiKey, offset = 0) {
  if (offset > 0) {
    return [];
  }
  const options = await getDefaultOptions();
  const AD = new AllDebridClient(apiKey, options);
  return AD.magnet.status()
      .then(response => response.data.magnets)
      .then(torrents => (torrents || [])
          .filter(torrent => torrent && statusReady(torrent.statusCode))
          .map(torrent => ({
            id: `${KEY}:${torrent.id}`,
            type: Type.OTHER,
            name: torrent.filename
          })));
}

async function getItemMeta(itemId, apiKey) {
  const options = await getDefaultOptions();
  const AD = new AllDebridClient(apiKey, options);
  return AD.magnet.status(itemId)
      .then(response => response.data.magnets)
      .then(torrent => ({
        id: `${KEY}:${torrent.id}`,
        type: Type.OTHER,
        name: torrent.filename,
        videos: torrent.links
            .filter(file => isVideo(file.filename))
            .map((file, index) => ({
              id: `${KEY}:${torrent.id}:${index}`,
              title: file.filename,
              released: new Date(torrent.uploadDate * 1000 - index).toISOString(),
              streams: [{ url: `${apiKey}/${torrent.hash.toLowerCase()}/${encodeURIComponent(file.filename)}/${index}` }]
            }))
      }))
}

async function resolve({ ip, apiKey, infoHash, cachedEntryInfo, fileIndex }) {
  console.log(`Unrestricting AllDebrid ${infoHash} [${fileIndex}] for IP ${ip}`);
  const options = await getDefaultOptions(ip);
  const AD = withUserIp(new AllDebridClient(apiKey, options), ip);

  return _resolve(AD, infoHash, cachedEntryInfo, fileIndex)
      .catch(error => {
        if (errorExpiredSubscriptionError(error)) {
          console.log(`Access denied to AllDebrid ${infoHash} [${fileIndex}]`);
          return StaticResponse.FAILED_ACCESS;
        }
        return Promise.reject(`Failed AllDebrid adding torrent ${JSON.stringify(error)}`);
      });
}

async function _resolve(AD, infoHash, cachedEntryInfo, fileIndex) {
  const torrent = await _createOrFindTorrent(AD, infoHash);
  if (torrent && statusReady(torrent.statusCode)) {
    return _unrestrictLink(AD, torrent, cachedEntryInfo, fileIndex);
  } else if (torrent && statusDownloading(torrent.statusCode)) {
    console.log(`Downloading to AllDebrid ${infoHash} [${fileIndex}]...`);
    return StaticResponse.DOWNLOADING;
  } else if (torrent && statusHandledError(torrent.statusCode)) {
    console.log(`Retrying downloading to AllDebrid ${infoHash} [${fileIndex}]...`);
    return _retryCreateTorrent(AD, infoHash, cachedEntryInfo, fileIndex);
  }

  return Promise.reject(`Failed AllDebrid adding torrent ${JSON.stringify(torrent)}`);
}

async function _createOrFindTorrent(AD, infoHash) {
  return _findTorrent(AD, infoHash)
      .catch(() => _createTorrent(AD, infoHash));
}

async function _retryCreateTorrent(AD, infoHash, encodedFileName, fileIndex) {
  const newTorrentId = await _createTorrent(AD, infoHash);
  const newTorrent = await AD.magnet.status(newTorrentId);
  return newTorrent && statusReady(newTorrent.statusCode)
      ? _unrestrictLink(AD, newTorrent, encodedFileName, fileIndex)
      : StaticResponse.FAILED_DOWNLOAD;
}

async function _findTorrent(AD, infoHash) {
  const torrents = await AD.magnet.status().then(response => response.data.magnets);
  const foundTorrents = torrents.filter(torrent => torrent.hash.toLowerCase() === infoHash);
  const nonFailedTorrent = foundTorrents.find(torrent => !statusError(torrent.statusCode));
  const foundTorrent = nonFailedTorrent || foundTorrents[0];
  return foundTorrent || Promise.reject('No recent torrent found');
}

async function _createTorrent(AD, infoHash) {
  const magnetLink = await getMagnetLink(infoHash);
  const uploadResponse = await AD.magnet.upload(magnetLink);
  const torrentId = uploadResponse.data.magnets[0].id;
  return AD.magnet.status(torrentId).then(statusResponse => statusResponse.data.magnets);
}

async function _unrestrictLink(AD, torrent, encodedFileName, fileIndex) {
  const targetFileName = decodeURIComponent(encodedFileName);
  const videos = torrent.links.filter(link => isVideo(link.filename));
  const targetVideo = Number.isInteger(fileIndex)
      ? videos.find(video => targetFileName.includes(video.filename))
      : videos.sort((a, b) => b.size - a.size)[0];

  if (!targetVideo && torrent.links.every(link => isArchive(link.filename))) {
    console.log(`Only AllDebrid archive is available for [${torrent.hash}] ${encodedFileName}`)
    return StaticResponse.FAILED_RAR;
  }
  if (!targetVideo || !targetVideo.link || !targetVideo.link.length) {
    return Promise.reject(`No AllDebrid links found for [${torrent.hash}] ${encodedFileName}`);
  }
  const unrestrictedLink = await AD.link.unlock(targetVideo.link).then(response => response.data.link);
  console.log(`Unrestricted AllDebrid ${torrent.hash} [${fileIndex}] to ${unrestrictedLink}`);
  return unrestrictedLink;
}

async function getDefaultOptions(ip) {
  // AllDebrid rejects datacenter IPs with NO_SERVER, so a VPS-hosted addon
  // must reach it through a residential proxy (http://user:pass@host:port).
  const proxy = process.env.ALLDEBRID_PROXY;
  return { base_agent: AGENT, timeout: 30000, ...(proxy && { proxy }) };
}

// AllDebrid rejects magnet uploads and link unlocks from datacenter IPs
// (NO_SERVER). Its api takes the end user's IP as an `ip` param, as
// MediaFusion sends it. The client library replaces any default query
// string, so the param is merged into every request here instead.
function withUserIp(AD, ip) {
  if (!ip) {
    return AD;
  }
  const request = AD._request.bind(AD);
  AD._request = (endpoint, o = {}) => request(endpoint, {
    ...o,
    qs: { ...o.qs, ip },
    ...(o.form && { form: { ...o.form, ip } })
  });
  return AD;
}

function statusError(statusCode) {
  return [5, 6, 7, 8, 9, 10, 11].includes(statusCode);
}

function statusHandledError(statusCode) {
  return [5, 7, 9, 10, 11].includes(statusCode);
}

function statusDownloading(statusCode) {
  return [0, 1, 2, 3].includes(statusCode);
}

function statusReady(statusCode) {
  return statusCode === 4;
}

function errorExpiredSubscriptionError(error) {
  return ['MUST_BE_PREMIUM', 'MAGNET_MUST_BE_PREMIUM', 'FREE_TRIAL_LIMIT_REACHED'].includes(error.code);
}

module.exports = { getCachedStreams, resolve, getCatalog, getItemMeta };