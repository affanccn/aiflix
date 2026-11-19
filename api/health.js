const app = require('../server');

module.exports = (req, res) => {
    req.url = '/api/health';
    return app(req, res);
};
