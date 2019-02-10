/**
 * Controller for handling User related HTML requests and responses.
 */

/**
 * Imports the model code for the User endpoints
 */
const User = require('../models/users.server.model');


/**
 * Imports the database controller for making MYSQL connections
 */
const db = require('../../config/db');


/**
 * Controls Server response to incoming 'Create new User' endpoint request. Possible response status codes are: 400, 201, 500.
 * @param req the HTML request to create a new user
 * @param res the HTML response that the server will make to the client
 */
exports.create = function(req, res){

    let  user_data = [
            req.body.username,
            req.body.givenName,
            req.body.familyName,
            req.body.email,
            req.body.password
    ];
    User.insert(user_data, req.body.username, function(err, result) {
        if(err) {

            res.statusMessage = "Malformed request";
            res.status(400).end();

        } else if (result == false) {
            res.sendStatus(500);

        } else {
            res.status(201);
            res.json(result);
        }

    });
};


/**
 * Controls Server response to incoming 'Get User' endpoint request. Possible response status codes are: 404, 200.
 * @param req the HTML request to get a user
 * @param res the HTML response that the server will make to the client
 */
exports.read = function(req, res){
    let target_id = req.params.id;
    let token = req.get('X-Authorization');
    User.getOne(target_id, token, function(result){
         if (result === "ERROR") {
            res.sendStatus(404);
        } else {
            res.status(200);
            res.json(result);
        }
    });

};


/**
 * Controls Server response to incoming 'Update User' endpoint request. Possible response status codes are: 401, 201, 500.
 * @param req the HTML request to update a user
 * @param res the HTML response that the server will make to the client
 */
exports.patch = function(req, res){
    db.get_pool().query("Select count(*) as count from auction_user where user_id = ? and user_token = ?", [req.params.id, req.get("X-Authorization")], function(err, answer) {
        if (err) {
            //console.log(err);
            res.sendStatus(500);
            return;
        } else if (answer[0].count == 1) {
            let id = req.params.id;
            let user_data = req.body;
            User.alter(user_data, id, function (err, result) {
                if (err) {

                    res.sendStatus(401);


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
 * Controls Server response to incoming 'Login' endpoint request. Possible response status codes are: 400, 200.
 * @param req the HTML request to login a user
 * @param res the HTML response that the server will make to the client
 */
exports.login = function(req, res) {
    let user_data = req.query;
    User.login(user_data, function(err, result){

        if(err) {
            res.statusMessage = "Invalid username/email/password supplied";
            res.status(400).end();
        } else {
            res.status(200).send(result);
        }
    });
}


/**
 * Controls Server response to incoming 'Logout' endpoint request. Possible response status codes are: 200, 500.
 * @param req the HTML request to logout a user
 * @param res the HTML response that the server will make to the client
 */
exports.logout =  function(req, res){
    let token = req.get('X-Authorization');
    User.remove(token, function(result, err){
        if (err) res.sendStatus(500);
        res.sendStatus(200);
    });
};
