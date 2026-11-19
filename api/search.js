const app = require('../server');

module.exports = (req, res) => {
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    req.url = '/api/search' + query;
    return app(req, res);
};
