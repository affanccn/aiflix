const app = require('../server');

module.exports = (req, res) => {
    req.url = '/api/movie-suggestions';
    return app(req, res);
};
