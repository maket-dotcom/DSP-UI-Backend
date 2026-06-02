const compression = require("compression");

// Response Compression Middleware with 2KB threshold
const compressResponse = compression({ threshold: 2048 });

/**
 * Unified GZIP Compression Middleware
 * - Intercepts and overrides the client's Accept-Encoding to 'gzip' (if supported) to enforce standard GZIP.
 * - Dynamically executes the response compression middleware.
 */
const gzipCompression = (req, res, next) => {
  if (req.headers["accept-encoding"]) {
    if (req.headers["accept-encoding"].includes("gzip")) {
      req.headers["accept-encoding"] = "gzip";
    }
  }
  compressResponse(req, res, next);
};

module.exports = gzipCompression;
