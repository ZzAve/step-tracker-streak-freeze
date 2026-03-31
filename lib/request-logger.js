'use strict';

const crypto = require('crypto');
const logger = require('./logger');

/**
 * Creates a request-scoped Pino child logger with structured context fields.
 * Returns { log, logResponse } where log is the child logger and logResponse
 * logs the final request duration and status code.
 */
function createRequestLogger(req) {
  const correlationId = req.headers['x-vercel-id'] || crypto.randomUUID();
  const startTime = Date.now();

  const log = logger.child({
    route: req.url,
    method: req.method,
    correlationId,
  });

  function logResponse(res) {
    const durationMs = Date.now() - startTime;
    log.info('request completed %o', { durationMs, statusCode: res.statusCode });
  }

  return { log, logResponse };
}

module.exports = { createRequestLogger };
