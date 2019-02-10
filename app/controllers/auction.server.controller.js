/**
 * Controller for handling Auction related HTML requests and responses.
 */

/**
 * Imports the model code for the Auction endpoints
 */
const model = require('../models/auction.server.model');


/**
 * Imports the database controller for making MYSQL connections
 */
const db = require('../../config/db');


/**
 * Controls Server response to incoming 'View all Auctions' endpoint request. Possible response status codes are: 400, 200, 500.
 * @param req the HTML request to view all the auctions
 * @param res the HTML response that the server will make to the client
 */
exports.viewAll = function(req, res){
    let array = [];
    model.viewAuctions(req, function(err, result) {
        if(err) { // Bad request
            res.sendStatus(400);
        } else if (result == "blank") { // No auctions meet the filtering requirements
            res.status(200);
            res.json(array);
        }else if (result != false) { // The server returned some auctions
            res.status(200);
            res.json(result);

        }  else { // Something went wrong with the server
            res.sendStatus(500);
        }
    });
};


/**
 * Controls Server response to incoming 'Create new Auction' endpoint request. Possible response status codes are: 400, 201, 500.
 * @param req the HTML request to create a new auction
 * @param res the HTML response that the server will make to the client
 */
exports.create = function(req, res){

    let  data = [
        req.body.categoryId,
        req.body.title,
        req.body.description,
        req.body.startDateTime,
        req.body.endDateTime,
        req.body.reservePrice,
        req.body.startingBid,
    ];
    model.createAuction(data, req.get('X-Authorization'), function(err, result) {
        if(err) {
            res.sendStatus(400);
        } else if (result != false) {
            res.status(201);
            res.json(result);
        } else {
            res.sendStatus(500);
        }
    });
};


/**
 * Controls Server response to incoming 'View Auction' endpoint request. Possible response status codes are: 400, 404, 200, 500.
 * @param req the HTML request to view the details of a auction
 * @param res the HTML response that the server will make to the client
 */
exports.viewAuction = function(req, res){
    model.getAuction( req.params.id, function(err, result) {
        if(err) {
            res.sendStatus(400);
        } else if (result === "Not Found") {
            res.sendStatus(404);
        } else if (result == false) {
            res.sendStatus(500);
        } else {
            res.status(200);
            res.json(result);
        }

    });
};



/**
 * Controls Server response to incoming 'Update existing Auction' endpoint request. Possible response status codes are: 400, 403, 404, 201, 500.
 * @param req the HTML request to update the details of an auction
 * @param res the HTML response that the server will make to the client
 */
exports.update = function(req, res){
    db.get_pool().query("Select count(*) as count from auction where auction_id = ? and auction_userid = (Select user_id " +
        "from auction_user where user_token = ?)", [req.params.id, req.get("X-Authorization")], function(err, answer) {
        if (err) {
            res.sendStatus(500);
            return;
        } else if (answer[0].count == 1) {
            model.updateAuction(req.body, req.params.id, function(err, result) {
                if(err) {
                    res.sendStatus(400);
                } else if (result === "Not Found") {
                    res.sendStatus(404);
                } else if (result === "Forbidden") {
                    res.sendStatus(403);
                } else if (result != false) {
                    //console.log(result);
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
 * Controls Server response to incoming 'View all Bids for a Auction' endpoint request.  Possible response status codes are: 400, 404, 200.
 * @param req the HTML request to view all bids for a auction
 * @param res the HTML response that the server will make to the client
 */
exports.viewBids = function(req, res){
    model.viewBids(req.params.id, function(err, result) {
        if(err) {
            res.sendStatus(400);
        } else if (result === "Not Found") {
            res.sendStatus(404);
        } else  {
            res.status(200);
            res.json(result);

        }
    });
};



/**
 * Controls Server response to incoming 'Make Bid on a Auction' endpoint request. Possible response status codes are: 400, 404, 201, 500.
 * @param req the HTML request to make a bid on a auction
 * @param res the HTML response that the server will make to the client
 */
exports.bid = function(req, res){
    model.createBid(req.params.id, req.query.amount, req.get('X-Authorization'), function(err, result) {
        if(err) {
            res.sendStatus(400);
        } else if (result === "Not Found") { // Could
            res.sendStatus(404);
        } else if (result != false) {
            res.sendStatus(201);
        } else {
            res.sendStatus(500);
        }
    });
};