/**
 * Controller for handling Database related HTML requests and responses.
 */


/**
 * Imports the database controller for making MYSQL connections
 */
const database = require('../models/database.server.model');



/**
 * Controls Server response to incoming 'Database Reset' endpoint request. Possible response status codes are: 400, 200, 500.
 * @param req the HTML request to reset the MYSQL database tables
 * @param res the HTML response that the server will make to the client
 */
exports.reset = function(req, res){

    database.resetTables(function(result, err){
        if(err) {
            res.status = (400);
            res.send("Malformed request.");
        } else if (result != false) {
            res.status(200);
            res.send("OK");
        } else {
            res.sendStatus(500);
        }

    });
};



/**
 * Controls Server response to incoming 'Database Resample' endpoint request. Possible response status codes are: 400, 201, 500.
 * @param req the HTML request to resample the MYSQL database tables
 * @param res the HTML response that the server will make to the client
 */
exports.resample = function(req, res){
    database.respawnTables(function(result, err){
        if(err) {
            res.status = (400);
            res.send("Malformed request.");
        } else if (result != false) {
            res.status(201);
            res.send("Sample of data has been reloaded.");
        } else {
            res.sendStatus(500);
        }

    });
};

