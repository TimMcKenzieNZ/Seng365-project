/**
 * Model code to handle all Photo related HTML requests
 */


/**
 * Imports the database controller for making MYSQL connections
 */
const db = require('../../config/db');


const fs = require('fs');


const path = require('path');


const appDir = path.dirname(require.main.filename);


/**
 * Handles a client's 'Add Photo' HTML request.
 * @param auction_id the id of the auction to add a photo to
 * @param req the request which contains the photo to be added
 * @param type the type of photo which will be "image/jpeg" or "image/png"
 * @param done Callback function which handles the SQL database response
 * @returns {*} the callback function 'done'
 */
exports.addPhoto = function(auction_id, req, type, done){
    let values = [auction_id];
    // check db if auction exists
    db.get_pool().query("SELECT count(*) AS count from auction WHERE auction_id = ?", values, function(err, row) {
        if (err) {
            return done(false, false); // the id was bad = 400
        }
        if (row[0].count == 1) { // auction exists
            // Checking photo does not already exist in database
            db.get_pool().query("SELECT count(*) AS count from photo WHERE photo_auctionid = ?", values, function(err, row) {
                if (err) {
                    return done(false, false); // something went wrong - 500
                }
                if (row[0].count == 1) { // a photo already exists
                    values = ['./uploads/' + auction_id + type, auction_id];

                    return done(true, false); // trying to post an existing photo.

                } else { // its a new photo
                    values = [auction_id, './uploads/' + auction_id + type];
                    req.pipe(fs.createWriteStream('./uploads/' + auction_id + type));
                        db.get_pool().query('INSERT INTO photo (photo_auctionid, photo_image_URI) VALUES (?)', [values], function (err, result) {
                            if (err) {
                                return done(false, false); // failed to insert into database - 500
                            }
                            return done(false, true); // updated database and folder successfully - 200
                        });
                }
            });
        } else { // auction is not unique or does not exist = 404
            return done(false, "Not Found");
        }
    });
};


/**
 * Handles a client's 'Get Photo' HTML request.
 * @param auction_id the id of the auction to get the photo from
 * @param done Callback function which handles the SQL database response
 * @returns {*} the callback function 'done'
 */
exports.getPhoto = function(auction_id, done){
    db.get_pool().query("SELECT photo_image_URI from photo WHERE photo_auctionid = ?", [auction_id], function(err, row) {
        if (err) {
            return done(false, false, false); // id was bad = 400
        }
        if (row.length == 1) {
            try { // auction exists
                let path2 = row[0].photo_image_URI;
                fs.stat(path2, function(err) {
                    if (err) {
                        return done(false, false);
                    }
                let result = appDir + path2.substring(1,);
                if (path2.substring(path2.length -2, path2.length) === "eg") {

                    return done(false, result, "image/jpeg"); // image has been retrieved = 200
                } else {
                    return done(false, result, "image/png"); // image has been retrieved = 200
                }
                });

            } catch (err){ // could not find photo so return default
                let result =  appDir + "/uploads/exist/lily2.jpeg";
                return done(false, result, "image/jpeg");
            }
        } else { // could not find photo so return default
            let result =  appDir + "/uploads/exist/lily2.jpeg";
            return done(false, result, "image/jpeg");
            //return done(false, "Not Found", false) // could not find photo = 404
        }
    });
};


/**
 * Handles a client's 'Delete Photo' HTML request.
 * @param auction_id the id of the auction which contains the photo to be deleted
 * @param done Callback function which handles the SQL database response
 * @returns {*} the callback function 'done'
 */
exports.deletePhoto = function(auction_id,  done){
    let values = [auction_id];
    // // check there is a photo.
    db.get_pool().query("SELECT photo_image_URI from photo WHERE photo_auctionid = ?", values, function(err, URI) { // check there is a photo
            if (err) {
                return done(false, false); // something went wrong with the query = 500
            }
            if (URI.length == 1) { // found the photo
                let path = URI[0].photo_image_URI;
                fs.unlink(path, function(err) {
                    if (err) {
                        return done(false, false) // couldn't find/unlink image = 500
                    }
                    db.get_pool().query("DELETE FROM photo WHERE photo_auctionid = ?", values, function(err, row) {
                        if(err) return done(false, false);// something went wrong

                        return done(false, true); // photo successfully deleted = 201
                    });

                });
            } else {
                return done(false, "Not Found"); // there is no photo for the given parameters or there is a duplicate photo
            }
        });
};