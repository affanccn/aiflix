const app = require('../server');

module.exports = (req, res) => {
    req.url = '/api/test-gemini';
    return app(req, res);
};
