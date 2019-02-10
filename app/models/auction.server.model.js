/**
 * Model code to handle all Auction related HTML requests
 */


/**
 * Imports the database controller for making MYSQL connections
 */
const db = require('../../config/db');

/**
 * Required to format date information into forms acceptable to the MQSQL database
 */
const datetime = require('node-datetime');


/**
 * Handles a client's 'View all Auctions' HTML request. The function takes in the auction data from the request body and dynamically
 * constructs an SQL statement from the data. The SQL statement is then executed and the callback function processes the database reply.
 * @param req the HTML request to view all auctions
 * @param done Callback function which handles the SQL database response
 * @returns {*} the callback function 'done'
 */
exports.viewAuctions = function(req, done){
    let startindex = req.query.startIndex;
    let count = req.query.count;
    let q = req.query.q;
    let categoryid = req.query.categoryid;
    let seller = req.query.seller;
    let bidder = req.query.bidder;
    let auctions = [];
    let values = [];
    let sql =
        "SELECT a.*, c.category_title  " +
        "FROM auction a " +
        "LEFT JOIN category c " +
        "ON a.auction_categoryid = c.category_id " +

        "Where a.auction_id > -1"; // This is always true. Its included here so additional search parameters can be added using the 'AND" conjunction.

    if (q !== undefined) {
        sql += " and a.auction_title like '%" + q + "%'";
    }
    if (categoryid !== undefined && categoryid == parseInt(categoryid, 10)  && categoryid > 0) {
        values.push(categoryid);
        sql += " and a.auction_categoryid = ?";
    }
    if (seller !== undefined && seller == parseInt(seller, 10)  && seller > 0) {
        values.push(seller);
        sql += ' and a.auction_userid = ?';
    }
    if (bidder !== undefined && bidder == parseInt(bidder, 10)  && bidder > 0) {
        values.push(bidder);
        sql = sql.substring(0, 106) + "Left Join bid b On a.auction_id = b.bid_auctionid " + sql.substring(106,);
        sql = sql.substring(0, 29) + ", b.bid_amount " + sql.substring(29,);
        sql += ' and b.bid_userid = ? and a.auction_id = b.bid_auctionid and b.bid_amount = (Select max(bid_amount) from bid where bid_auctionid = a.auction_id)';
    }
    sql += ' order by auction_startingdate DESC';
    if ( count !== undefined && count == parseInt(count, 10)  && count > 0) {
        sql += " limit " + count;
    }
    if (startindex !== undefined && startindex == parseInt(startindex, 10)  && startindex > 0) {
        sql +=" OFFSET " + startindex;
    }



    // We now execute the dynamic SQL statement and process the database reply.
    db.get_pool().query(sql, values, function(err, rows) {
        if (err) {
            return done(err, rows); // bad inputs = 400
        } if (rows.length == 0) {
            return done(false, "blank"); // no auctions matched specifications = 201
        } else {
            let values2 = [];
            for (row of rows) {
                if (!values2.includes(row.auction_id)) { // in the case that auction matched more than one search criteria we don't want to return duplicate auctions
                    values2.push(row.auction_id);
                }
            }
            let auction_bids = "SELECT max(bid_amount) as max, bid_auctionid, bid_userid from bid WHERE bid_auctionid IN (?)";

            db.get_pool().query(auction_bids, values2, function (err, bids) { // For every auction we also get its bid history
                if (err) {
                    return done(false, false) // something went wrong = 500
                } else {
                    for (row of rows) {
                        let auction = {
                            "id": row.auction_id,
                            "categoryTitle": row.category_title,
                            "categoryId": row.auction_categoryid,
                            "title": row.auction_title,
                            "reservePrice": row.auction_reserveprice ,
                            "startDateTime": datetime.create(row.auction_startingdate).now(),
                            "endDateTime": datetime.create(row.auction_endingdate).now(),
                            "currentBid": row.auction_startingprice 
                        };
                        id = row.auction_id;
                        if (row.bid_amount !== undefined) {
                            auction.currentBid = row.bid_amount ;
                        }
                        for (bid of bids) {
                            if (bid.bid_auctionid == id) {
                                if (bid.bid_amount  > auction.currentBid) {
                                    auction.currentBid = bid.bid_amount ;
                                }
                            }
                        }
                        auctions.push(auction);
                    }
                    return done(false, auctions);
                }
            });
        }
    });
};


/**
 * Handles a client's 'Create a new Auction' HTML request. The request auction data is first validated based on the API specification and if its ok a SQL
 * statement to create a auction is made. The SQL statement is then executed and the callback function processes the database reply.
 * @param body the HTML request body which contains the data needed to create a new auction
 * @param done Callback function which handles the SQL database response
 * @param token the user's authentication token
 * @returns {*} the callback function 'done'
 */
exports.createAuction = function(body, token, done){
    let bool = false; // boolean flag which signifies whether any request data is invalid
    try {
        if(!(body[0] == parseInt(body[0], 10)) || body[0] < 1) { // auction category ID must be an int > 0
            bool = true;
        } else if (body[1].length > 128) { // auction title is no longer than 128 characters
            bool = true;

        } else if (body[2].length > 512) { // auction description is no longer than 512 characters
            bool = true;

        } else if (body[3] > body[4] || body[3] < 0 || body[3] == null ||  body[3] < datetime.create(new Date()).now()){ // auction start time is < auction end time, is >= 0, is > than current time
            bool = true;

        } else if ( body[4] < 0 || body[4] == null) { // auction end time is > 0
            bool = true;

        } else if (body[6] < 0) { // reserve price must be >= 0
            bool = true;

        } else if(body[5] < 0 ) { // starting price must be >= 0
            bool = true;
        }
    } catch (err) {

        return done(err);
    }


    if (bool) {
        return done(true, false); // violation of db constraints = 400
    }
    try {
        body[3] = new Date(body[3]); // start time is a valid date
        body[4] = new Date(body[4]); // end time is a valid date

    } catch (err) {
        return done(err, false);
    }

    db.get_pool().query("SELECT user_id from auction_user where user_token = ?", [token], function(err, tok) {

        if (err) {

            return done(false, false);
        }
        if (tok.length == 1) {
            body.push(tok[0].user_id);
            body.push(new Date().toISOString());

            db.get_pool().query('INSERT INTO auction (auction_categoryid, auction_title, auction_description, auction_startingdate, ' +
                'auction_endingdate, auction_reserveprice, auction_startingprice, auction_userid, auction_creationdate ) VALUES (?)', [body], function(err, result) {
                if (err) {
                    return done(false, false);
                }

                return done(false, {'id': result.insertId });
            });
        } else {
            return done(false, false) // we got more than one user = 500
        }
    });
};


/**
 * Handles a client's 'Get Auction' HTML request.
 * @param id the id of the auction to get
 * @param done Callback function which handles the SQL database response
 * @returns {*} the callback function 'done'
 */
exports.getAuction = function( id, done){
    db.get_pool().query("SELECT a.*, u.user_username, c.category_title from auction a, auction_user u, category c where " +
        "c.category_id = a.auction_categoryid and a.auction_userid = u.user_id and auction_id = ?",[id], function(err, row) {
        if (err) {
            return done(err, false); // id was bad = 400
        }
        if (row.length == 1) { // we got the auction
            let bids = [];
            let current = 0;
            let first = row[0].auction_startingprice ;
            let lowest = 99999999999999999999999999;
            db.get_pool().query("SELECT b.bid_userid, b.bid_amount, b.bid_datetime, a.user_username from bid b, auction_user a" +
                " where b.bid_userid = a.user_id and b.bid_auctionid = ?", [id], function(err, result) {
                if (err) {
                    return done(false, false); // something went wrong = 500
                } else if (result.length == 0) { // no bids
                    current = row[0].auction_startingprice ; // no bids on that auction
                    lowest = current ;
                } else {
                    for (const ro of result) {
                        let bid;
                        let time = datetime.create(ro.bid_datetime).now();
                        if (ro.bid_amount  > current ) {
                            current = ro.bid_amount  ;
                        }
                        if (ro.bid_amount  < lowest ) {
                            lowest = ro.bid_amount ;
                        }
                        bid = {
                            "amount": ro.bid_amount ,
                            "datetime": time,
                            "buyerId": ro.bid_userid,
                            "buyerUsername": ro.user_username
                        };
                        bids.push(bid);
                    }
                }
                    let seller = {
                        "id": row[0].auction_userid,
                        "username": row[0].user_username,
                    };
                    if (lowest > first) {
                        first = lowest;
                    }
                    let auction = {
                        "categoryId": row[0].auction_categoryid,
                        "categoryTitle": row[0].category_title,
                        "title": row[0].auction_title,
                        "reservePrice": row[0].auction_reserveprice ,
                        "startDateTime": datetime.create(row[0].auction_startingdate).now(),
                        "endDateTime": datetime.create(row[0].auction_endingdate).now(),
                        "description": row[0].auction_description,
                        "creationDateTime": datetime.create(row[0].auction_creationdate).now(),
                        "seller": seller,
                        "startingBid": first ,
                        "currentBid": current ,
                        "bids": bids
                    };
                    return done(false, auction); //200


            });
        } else {
             return done(false, "Not Found"); // couldn't find auction = 404
        }
    });
};


/**
 * Handles a client's 'Update Auction' HTML request. The request data is first validated against the API specification and if its
 * ok a SQL statement is executed to update the auction.
 * @param body the request body which contains the data needed to update an auction
 * @param id the auction to update
 * @param done Callback function which handles the SQL database response
 * @returns {*} the callback function 'done'
 */
exports.updateAuction = function(body, id, done){
    let values = [];
    let bool = false;
    let flag = false;

    db.get_pool().query("Select max(bid_amount) as max from bid where bid_auctionid = ?", [id], function(err, row) {
        if (err) {
            return done(false, false);} // = 500
        if (row[0].max != null) {
            return done(false, "Forbidden"); // = 403
        } else {
            db.get_pool().query("Select count(*) as count from auction where auction_id = ?", [id], function(err, rows) {
                if (err) {
                    return done(false, false);
                } else if (rows[0].count == 1) {
                    let sql = 'UPDATE auction SET ';
                    if(body.categoryId != undefined) {
                        if(body.categoryId !==  parseInt(body.categoryId, 10) || body.categoryId < 1) {
                            flag = true;
                        }
                        values.push(body.categoryId);
                        sql += 'auction_categoryid = ?, ';
                        bool = true;
                    }

                    if(body.title !== undefined) {
                        if(body.title.length > 128) {
                            flag = true;
                        }
                        values.push(body.title);
                        sql += 'auction_title = ?, ';
                        bool = true;
                    }
                    if(body.description !== undefined) {
                        if(body.description.length > 512) {
                            flag = true;
                        }
                        values.push(body.description);
                        sql += 'auction_description = ?, ';
                        bool = true;
                    }
                    if(body.startDateTime !== undefined) {
                        if(body.startDateTime !==  parseInt(body.startDateTime, 10) || body.startDateTime < 0) {
                            flag = true;
                        } else if ((body.endDateTime !== undefined) && (body.endDateTime < body.startDateTime))  {
                            flag = true;
                        }
                        values.push(new Date(body.startDateTime));
                        sql += 'auction_startingdate = ?, ';
                        bool = true;
                    }
                    if(body.endDateTime !== undefined) {
                        if(body.endDateTime !==  parseInt(body.endDateTime, 10) || body.endDateTime < 0) {
                            flag = true
                        } else if ((body.startDateTime !== undefined) && (body.endDateTime < body.startDateTime))  {
                            flag = true;
                        }
                        values.push(new Date(body.endDateTime));
                        sql += 'auction_endingdate = ?, ';
                        bool = true;
                    }
                    if(body.reservePrice !== undefined) {
                        if(body.reservePrice < 0) {
                            flag = true;
                        }
                        values.push(body.reservePrice);
                        sql += 'auction_reserveprice = ?, ';
                        bool = true;
                    }
                    if(body.startingBid !== undefined) {
                        if(body.startingBid < 0) {
                            flag = true;
                        }
                        values.push(body.startingBid);
                        sql += 'auction_startingprice = ?, ';
                        bool = true;
                    }
                    if(bool == false) { // the JSON body had nothing in it so its technically valid
                        return done(false, true);
                    } else if (flag == true) {
                        return done("ERROR - malformed body"); // = 400
                    }
                    sql = sql.substring(0,sql.length - 2);
                    sql += " WHERE auction_id = ?";
                    values.push(id);
                    db.get_pool().query(sql, values, function(err, result) {
                        if (err) {
                            return done(false, false);
                        }

                        if (result.affectedRows == 1) {
                            return done(false, result); // = 201
                        } else {
                            return done(false, "Not Found"); // no auction meet the id = 404
                        }

                    });
                } else {
                    return done(false, "Not Found");
                }
            });

        }
    });

};


/**
 * Handles a client's 'View all Bids' HTML request.
 * @param id the auction id to view bids for
 * @param done Callback function which handles the SQL database response
 * @returns {*} the callback function 'done'
 */
exports.viewBids = function(id, done){
    let array = [];
    db.get_pool().query("SELECT b.bid_userid, b.bid_amount, b.bid_datetime, a.user_username from bid b, auction_user a" +
        " where b.bid_userid = a.user_id and b.bid_auctionid = ?",[id], function(err, rows) {

        if (err) {
            return done(false, false); // id was bad = 400
        } else if (rows.length == 0) {

            return done(false, array); // no bids on that auction
        } else {
            for (const row of rows) {
                let bid;
                let time = datetime.create(row.bid_datetime).now();

                bid = {"amount": row.bid_amount , "datetime": time, "buyerId": row.bid_userid, "buyerUsername": row.user_username};
                array.push(bid);
            }
            return done(false, array);

        }

    });
};


/**
 * Handles a client's 'Create Bid' HTML request.
 * @param id the id of the auction for which to bid on
 * @param bid the bid amount
 * @param token the user's authentication token
 * @param done Callback function which handles the SQL database response
 * @returns {*} the callback function 'done'
 */
exports.createBid = function(id, bid, token, done){
    db.get_pool().query("SELECT auction_userid, auction_startingprice, auction_creationdate, auction_endingdate " +
        "FROM auction where auction_id = ?",[id], function(err, result) {
        if (err)  {
            return done(false, false); // id was bad = 400
        }
        if (result.length == 1) { // auction exists
            let seller = result[0].auction_userid;
            let price = result[0].auction_startingprice;
            let creation = result[0].auction_creationdate;
            let finish = new Date(result[0].auction_endingdate).getTime();
            let time = new Date().toISOString();

            db.get_pool().query("SELECT user_id FROM auction_user where user_token = ?",[token], function(err, row) { // get the bidder id
                if (err) {
                    return done(false, false);
                }
                db.get_pool().query("SELECT count(*) as count from bid where bid_auctionid = ?", [id], function(err, check) {
                    if (err) {

                        return done(false, false);
                    }
                    if (check[0].count > 0) {

                        db.get_pool().query("SELECT bid_amount, bid_datetime FROM bid where bid_amount = " +
                            "(Select MAX(bid_amount) from  bid where bid_auctionid = ?)",[id, id], function(err, query_result) {
                            if (err) {

                                return done(false, false);
                            }
                            let bidder = row[0].user_id;
                            try {

                                if (seller == bidder) {
                                    return done(true, false ); //seller cannot bid on own auction - 400
                                } else if (bid == undefined) {
                                    return done(true, false); // bid is bongo - 400
                                } else if (price > bid) {
                                    return done(true, false); // bid is insufficient - 400
                                }
                                else if (finish < new Date(time).getTime()) {
                                    return done(true, false); // auction has closed - 400
                                } else if ( new Date(time).getTime() < new Date(creation).getTime()) {
                                    return done(true, false); // bid before the auction started !? - 400
                                }
                            } catch (err) {
                                return done(err, false); // something wrong with the inputs - 400
                            }

                            let values = [bidder, id, bid, time ];
                            if (query_result.length == 1) { // another bid exists
                                let max_bid = query_result[0].bid_amount;
                                let bid_time = query_result[0].bid_datetime;
                                if (max_bid < bid && bid_time.toISOString() < time) {
                                    db.get_pool().query("INSERT into bid (bid_userid, bid_auctionid, bid_amount, bid_datetime) VALUES (?)"
                                        ,[values], function(err, final) {
                                            if (err) {
                                                return done(false, false); // something went wrong with the insert = 500
                                            }
                                            return done(false, true); // bid inserted = 201
                                        });
                                }
                                else {

                                    return done(true, false) // the bid was insufficient and/or violated the time between bids
                                }
                            }
                            else { // no bids have been made
                                db.get_pool().query("INSERT into bid (bid_userid, bid_auctionid, bid_amount, bid_datetime) VALUES (?)"
                                    , [values], function (err, final) {
                                        if (err) return done(false, false);
                                        return done(false, true); // bid inserted = 201
                                    });
                            }
                        });
                    } else { // no bids exists
                            let bidder = row[0].user_id;
                            try {

                                if (seller == bidder) {
                                    return done(true, false ); //seller cannot bid on own auction - 400
                                } else if (bid == undefined) {
                                    return done(true, false); // bid is bongo - 400
                                } else if (price > bid) {
                                    return done(true, false); // bid is insufficient - 400
                                }
                                else if (finish < time) {
                                    return done(true, false); // auction has closed - 400
                                } else if ( time < new Date(creation).getTime()) {
                                    return done(true, false); // bid before the auction started !? - 400
                                }
                            } catch (err) {
                                return done(err, false); // something wrong with the inputs - 400
                            }

                            let values = [bidder, id, bid, time ];
                                db.get_pool().query("INSERT into bid (bid_userid, bid_auctionid, bid_amount, bid_datetime) VALUES (?)"
                                    , [values], function (err, final) {
                                        if (err) return done(false, false);
                                        return done(false, true); // bid inserted = 201
                                    });
                    }
                });
            });
        } else {
            return done(false, "Not Found"); // auction does not exist
        }
    });
};