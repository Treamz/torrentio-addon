const { getRouter } = require('stremio-addon-sdk');
const requestIp = require('request-ip');
const userAgentParser = require('ua-parser-js');
const addonInterface = require('./addon');
const qs = require('querystring')
const { manifest } = require('./lib/manifest');
const { parseConfiguration, PreConfigurations } = require('./lib/configuration');
const landingTemplate = require('./lib/landingTemplate');
const { saveMessagePage } = require('./lib/landingTemplate');
const moch = require('./moch/moch');
const StaticResponse = require('./moch/static');

// What to tell the browser when a "save" link resolves to one of the message
// videos instead of a file: redirecting would save the clip itself.
const SAVE_MESSAGES = {
  [StaticResponse.DOWNLOADING]: 'The file is still downloading to your debrid service. Try again in a few minutes.',
  [StaticResponse.FAILED_ACCESS]: 'The debrid service denied access. Check your API key and subscription.',
  [StaticResponse.LIMITS_EXCEEDED]: 'Your debrid service limits are exceeded. Try again later.',
  [StaticResponse.FAILED_TOO_BIG]: 'The torrent is too big for your debrid plan.',
  [StaticResponse.FAILED_RAR]: 'The debrid service only has this torrent as an archive, there is no video file to save.'
};
const SAVE_MESSAGE_DEFAULT = 'The debrid service could not provide this file. Try another stream.';

// Behind Cloudflare, traefik replaces X-Forwarded-For with the Cloudflare edge
// address, which request-ip reads first. CF-Connecting-IP carries the real
// client address, and debrid services need it (AllDebrid's ip param).
function getClientIp(req) {
  return req.headers['cf-connecting-ip'] || requestIp.getClientIp(req);
}

const router = getRouter({ ...addonInterface, manifest: manifest() });

router.get('/', (_, res) => {
  res.redirect('/configure')
  res.end();
});

router.get(`/:preconfiguration(${Object.keys(PreConfigurations).join('|')})`, (req, res) => {
  res.redirect(`/${req.params.preconfiguration}/configure`)
  res.end();
});

router.get('/:configuration?/configure', (req, res) => {
  const configValues = parseConfiguration(req.params.configuration || '');
  const landingHTML = landingTemplate(manifest(configValues), configValues);
  res.setHeader('content-type', 'text/html');
  res.end(landingHTML);
});

router.get('/:configuration?/manifest.json', (req, res) => {
  const configValues = parseConfiguration(req.params.configuration || '');
  const manifestBuf = JSON.stringify(manifest(configValues));
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(manifestBuf)
});

router.get('/:configuration/:resource/:type/:id/:extra?.json', (req, res, next) => {
  const { configuration, resource, type, id } = req.params;
  const extra = req.params.extra ? qs.parse(req.url.split('/').pop().slice(0, -5)) : {}
  const configValues = { ...extra, ...parseConfiguration(configuration), ip: getClientIp(req) };
  addonInterface.get(resource, type, id, configValues)
      .then(resp => {
        const cacheHeaders = {
          cacheMaxAge: 'max-age',
          staleRevalidate: 'stale-while-revalidate',
          staleError: 'stale-if-error'
        };
        const cacheControl = Object.keys(cacheHeaders)
            .map(prop => resp[prop] && cacheHeaders[prop] + '=' + resp[prop])
            .filter(val => !!val).join(', ');

        res.setHeader('Cache-Control', `${cacheControl}, public`);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify(resp));
      })
      .catch(err => {
        if (err.noHandler) {
          if (next) {
            next()
          } else {
            res.writeHead(404);
            res.end(JSON.stringify({ err: 'not found' }));
          }
        } else {
          console.error(err);
          res.writeHead(500);
          res.end(JSON.stringify({ err: 'handler error' }));
        }
      });
});

function resolveParameters(req) {
  const userAgent = req.headers['user-agent'] || '';
  return {
    mochKey: req.params.moch,
    apiKey: req.params.apiKey,
    infoHash: req.params.infoHash.toLowerCase(),
    fileIndex: isNaN(req.params.fileIndex) ? undefined : parseInt(req.params.fileIndex),
    cachedEntryInfo: req.params.cachedEntryInfo,
    ip: getClientIp(req),
    isBrowser: !userAgent.includes('Stremio') && !!userAgentParser(userAgent).browser.name
  };
}

// Registered before the resolve route below, which would otherwise match a
// six segment /save/... path with moch = "save".
router.get('/save/:moch/:apiKey/:infoHash/:cachedEntryInfo/:fileIndex/:filename?', (req, res) => {
  // isBrowser stays false so the original file is returned, not a transcode
  moch.resolve({ ...resolveParameters(req), isBrowser: false })
      .then(url => {
        if (url.startsWith(`${StaticResponse.RESOLVER_HOST}/videos/`)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end(saveMessagePage(SAVE_MESSAGES[url] || SAVE_MESSAGE_DEFAULT));
          return;
        }
        res.writeHead(302, { Location: url, 'Cache-Control': 'no-store' });
        res.end();
      })
      .catch(error => {
        console.log(error);
        res.statusCode = 404;
        res.end();
      });
});

router.get('/:moch/:apiKey/:infoHash/:cachedEntryInfo/:fileIndex/:filename?', (req, res) => {
  moch.resolve(resolveParameters(req))
      .then(url => {
        res.writeHead(302, { Location: url });
        res.end();
      })
      .catch(error => {
        console.log(error);
        res.statusCode = 404;
        res.end();
      });
});

module.exports = function (req, res) {
  router(req, res, function () {
    res.statusCode = 404;
    res.end();
  });
};
