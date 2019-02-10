/**
 * Controller for handling Photo related HTML requests and responses.
 */


/**
 * Imports the model code for the Photo endpoints
 */
const Photo = require('../models/photo.server.model');


/**
 * Imports the database controller for making MYSQL connections
 */
const db = require('../../config/db');


/**
 * Controls Server response to incoming 'Get Photo' endpoint request. Possible response status codes are: 400, 200, 500.
 * @param req the HTML request to get a photo
 * @param res the HTML response that the server will make to the client
 */
exports.getOne = function(req, res){
    Photo.getPhoto(req.params.id, function(err, result, field) {
        if(err) {
            res.sendStatus(400);
        } else if (result === "Not Found") {
            res.set("Content-Type", field);
            res.status(200);
            res.sendFile(result)
        } else if (result != false) {
            //console.log(err, result)
            res.status(200);
            res.set("Content-Type", field);
            res.sendFile(result)


        } else {
            res.sendStatus(500);
        }

    });
};


/**
 * Controls Server response to incoming 'Add Photo' endpoint request. Possible response status codes are: 400, 404, 201, 500.
 * @param req the HTML request to add a new photo
 * @param res the HTML response that the server will make to the client
 */
exports.add = function(req, res){
    db.get_pool().query("Select count(*) as count from auction where auction_id = ? and auction_userid = (Select user_id " +
        "from auction_user where user_token = ?)", [req.params.id, req.get("X-Authorization")], function(err, answer) {
        if (err) {
            res.sendStatus(500);
            return;
        } else if (answer[0].count == 1) {

            let type;
            if (req.get('Content-Type') === 'image/jpeg') {
                type = '.jpeg';
            } else if (req.get('Content-Type') === 'image/png') {
                type = '.png';
            } else {
                res.sendStatus(400); // bad json body
                return;
            }

            Photo.addPhoto(req.params.id, req, type, function (err, result) {
                if (err) {
                    res.sendStatus(400);
                } else if (result === "Not Found") {
                    res.sendStatus(404);
                } else if (result != false) {
                    res.sendStatus(201);
                } else {
                    res.sendStatus(500);
                }

            });
        } else {
            res.sendStatus(401);
        }
    });
};


/**
 * Controls Server response to incoming 'Delete Photo' endpoint request. Possible response status codes are: 401, 201, 500.
 * @param req the HTML request to delete a photo
 * @param res the HTML response that the server will make to the client
 */
exports.remove = function(req, res){
    db.get_pool().query("Select count(*) as count from auction where auction_id = ? and auction_userid = (Select user_id " +
        "from auction_user where user_token = ?)", [req.params.id, req.get("X-Authorization")], function(err, answer) {
        if (err) {
            res.sendStatus(500);
            return;
        } else if (answer[0].count == 1) {
            Photo.deletePhoto(req.params.id, function(err, result) {
                if (result ==="Not Found") {
                    res.sendStatus(404);
                } else if (result != false) {
                    res.status(201).send("OK");
                } else {
                    res.sendStatus(500);
                }
            });
        } else { // Could not find the auction by the given auction id
            res.sendStatus(401);
        }
    });
};
