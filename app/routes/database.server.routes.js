/**
 * Handles all request routes relating to the DATABASE API endpoints (See API specification).
 */


/**
 * Imports the database controller for making MYSQL connections
 */
const db = require('../controllers/database.server.controller');


/**
 * Defines acceptable route paths to reset and resample the MYSQL database.
 * @param app the express application
 */
module.exports = function(app) {
    app.route('/api/v1/reset')
        .post(db.reset);

    app.route('/api/v1/resample')
        .post(db.resample);

}