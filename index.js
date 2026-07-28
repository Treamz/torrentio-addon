const express = require('express');
const rateLimit = require("express-rate-limit");
const requestIp = require("request-ip");
const serverless = require('./serverless');
const { initBestTrackers } = require('./lib/magnetHelper');

// The scraper repository is only present in full deployments and is used solely
// to sync the database schema on startup (when ENABLE_SYNC is set). A standalone
// addon expects the schema to already exist.
let scraperRepo = null;
try {
  scraperRepo = require('../scraper/lib/repository');
} catch (error) {
  console.log(`Scraper repository not available, skipping schema sync: ${error.message}`);
}

const app = express();
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hours
  max: 300, // limit each IP to 300 requests per windowMs
  headers: false,
  keyGenerator: (req) => requestIp.getClientIp(req)
});

app.use(express.static('static', { maxAge: '1y' }));
app.use(/^\/.*stream\/.+/, limiter);
app.use((req, res, next) => serverless(req, res, next));

// Initialize database and start server
async function start() {
  if (scraperRepo) {
    await scraperRepo.connect();
  }
  app.listen(process.env.PORT || 7000, () => {
    initBestTrackers()
        .then(() => console.log(`Started addon at: http://localhost:${process.env.PORT || 7000}`));
  });
}

start().catch(err => {
  console.error('Failed to start addon:', err);
  process.exit(1);
});
