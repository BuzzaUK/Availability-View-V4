const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Only apply proxy in development
  if (process.env.NODE_ENV !== 'production') {
    app.use(
      '/api',
      createProxyMiddleware({
        target: 'http://localhost:5001',
        changeOrigin: true,
      })
    );
  }
};