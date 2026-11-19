const app = require('../server');

module.exports = (req, res) => {
    req.url = '/api/trending';
    return app(req, res);
};
