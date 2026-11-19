const app = require('../server');

module.exports = (req, res) => {
    const id = req.query.id || req.query.movieId || (req.url.match(/\/trailer\/([^\/\?]+)/) || [])[1];
    req.url = id ? `/api/trailer/${id}` : '/api/trailer';
    return app(req, res);
};
