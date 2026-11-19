const app = require('../server');

module.exports = (req, res) => {
    const query = req.url && req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    req.url = '/api/movie-suggestions' + query;
    return app(req, res);
};
