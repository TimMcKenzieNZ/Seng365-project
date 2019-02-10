/**
 * Handles all request routes relating to the PHOTO API endpoints (See API specification).
 */


/**
 * Imports the controller for the Photo endpoints
 */
const photos = require('../controllers/photos.server.controller');


/**
 * Imports the database controller for making MYSQL connections
 */
const db = require('../../config/db');


/**
 * Checks if the user is authenticated before processing the user's request. If the user is not authenticated, a reject
 * HTTP status message is sent. Authentication is done by comparing the token given in the request with the tokens in the server database.
 */
const authenticate = function(req, res, next) {
    //console.log(req.get('X-Authorization'));
    let sql = "SELECT count(*) As count FROM auction_user WHERE user_token = ?";
    if( req.get('X-Authorization') != undefined) {
        db.get_pool().query(sql, req.get('X-Authorization'), function (err, row) {
            if (err) res.sendStatus(401);
            if (row[0].count == 1) { // one match
                next();
            } else {
                res.sendStatus(401);
            }
        })
    }
    else { // no a-auth token in header
        res.sendStatus(401);
    }
};




/**
 * Defines acceptable route paths to perform Photo related GET, POST, and DELETE requests.
 * @param app the express application
 */
module.exports = function(app){

    app.route('/api/v1/auctions/:id/photos').get(photos.getOne)


    app.post('/api/v1/auctions/:id/photos', authenticate, photos.add);


    app.delete('/api/v1/auctions/:id/photos', authenticate, photos.remove);


};