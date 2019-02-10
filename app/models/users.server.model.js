/**
 * Model code to handle all User related HTML requests
 */


/**
 * Imports the database controller for making MYSQL connections
 */
const db = require('../../config/db');

/**
 * For use in creating user session authentication tokens
 */
const tokens = require('express-token-api-middleware');

/**
 * For hashing created tokens
 */
const crypto = require('crypto');

const emailvalidator = require('email-validator');


/**
 * Checks if the given text variable is a valid JSON data object and parses it if it is. Returns an error otherwise
 * @param text a string object
 * @returns {*} Either a parsed JSON object or an error
 */
validateJSON = function(text) {
    try {
        let data = JSON.stringify(text);
        return JSON.parse(data);
    } catch(err) {
        return err;
    }
};


/**
 * Handles a client's 'Get User' HTML request.
 * @param target_id The id of the User to get
 * @param userToken the current user's authentication token
 * @param done Callback function which handles the SQL database response
 * @returns {*} the callback function 'done'
 */
exports.getOne = function(target_id, userToken, done){
    db.get_pool().query("SELECT user_id FROM auction_user WHERE user_token = ?", userToken, function(err, result) {

        if (err) return done(false, false);

        let user_id = result[0].user_id; // access returned row values.

        if (target_id == user_id) {
            sql = 'SELECT user_username, user_givenname, user_familyname, user_email, ' +
                'user_accountbalance FROM auction_user WHERE user_id = ?';
            db.get_pool().query(sql, target_id, function (err, rows) {
                if (err) return done(false, false);
                else if (rows.length == 0) { // no user matching id
                    return done("ERROR", false);
                }
                let ret = { "username": rows[0].user_username, "givenName": rows[0].user_givenname, "familyName": rows[0].user_familyname,
                    "email": rows[0].user_email, "accountBalance": rows[0].user_accountbalance};
                return done(ret);
            });
        } else {
            sql = 'SELECT user_username, user_givenname, user_familyname FROM auction_user WHERE user_id = ?';

            db.get_pool().query(sql, target_id, function (err, rows) {
                if (err) return done(false, false);
                else if (rows.length == 0) { // no user matching id
                    return done("ERROR", false);
                }
                let ret = {
                    "username": rows[0].user_username,
                    "givenName": rows[0].user_givenname,
                    "familyName": rows[0].user_familyname,
                };
                return done(ret);
            });
        }
    });
};


/**
 * Handles a client's 'Add User' HTML request. First validates the given user data against the API specification and if
 * its ok, sends an SQL statement to add the new user.
 * @param user_data the user data contained in the HTML request for which to use to create a new user
 * @param username the username of the user to be created. It will be checked to see if it is already being used
 * @param done Callback function which handles the SQL database response
 * @returns {*} the callback function 'done'
 */
exports.insert = function(user_data, username, done){
    let bool = false;
    try {
        if(user_data[0].length > 50 || user_data[1].length > 50 || user_data[2].length > 50) {
            bool = true;
        }
        if(user_data[3].length > 320 || user_data[4].length > 512 ||  user_data[4] === "") {
            bool = true;
        }
        if(!emailvalidator.validate(user_data[3])) {
            bool = true;
        }
    } catch (err) {


        return done(err);
    }

    if (bool) {
        return done(true, false);
    }
    db.get_pool().query('INSERT INTO auction_user (user_username, user_givenname, user_familyname, user_email, ' +
        'user_password) VALUES (?)', [user_data], function(err, result) {

        if (err) {


            return done(false, false);
        }
        db.get_pool().query('SELECT user_id from auction_user WHERE user_username = ?', username, function(err, row) {

            if (err)
            {
                return done(false, false);
            }
            if (row.length == 1) {
                return done(false, {'id': row[0].user_id});
            } else { // something went wrong with the querry
                return done(true, false);
            }
        });
    });
};


/**
 * Handles a client's 'Update User' HTML request. First validates the given userdata against the API specification and if it is ok,
 *  sends a SQL statement to update the user given by the id.
 * @param userdata the user data to update the user with
 * @param id the id of the user to update
 * @param done Callback function which handles the SQL database response
 * @returns {*} the callback function 'done'
 */
exports.alter = function(userdata, id, done){
    let values = [];
    let bool = false;
    let flag = false;
    let sql = 'UPDATE auction_user SET ';
    if(userdata.username != undefined) {

        if(userdata.username.length > 50) {
            flag = true;
        }
        values.push(userdata.username);
        sql += 'user_username = ?, ';
        bool = true;
    }

    if(userdata.givenName != undefined) {
        if(userdata.givenName.length > 50) {
            flag = true;
        }
        values.push(userdata.givenName);
        sql += 'user_givenname = ?, ';
        bool = true;
    }
    if(userdata.familyName != undefined) {
        if(userdata.familyName.length > 50) {
            flag = true;
        }
        values.push(userdata.familyName);
        sql += 'user_familyname = ?, ';
        bool = true;
    }
    if(userdata.email != undefined) {
        if(userdata.email.length > 320) {
            flag = true;
        }
        values.push(userdata.email);
        sql += 'user_email = ?, ';
        bool = true;
    }
    if(userdata.password != undefined) {
        if(userdata.password.length > 512) {
            flag = true;
        }
        values.push(userdata.password);
        sql += 'user_password = ?, ';
        bool = true;
    }
    if(bool == false) { // the JSON body had nothing in it so its technically valid
        return done(false, true);
    } else if (flag == true) {
        return done(false, false);
    }
    sql = sql.substring(0,sql.length - 2);
    sql += " WHERE user_id = ?";
    values.push(id);
    ;
    db.get_pool().query(sql,values, function (err, result)
    {
        if (err) {
            return done(false, false);
        }
        if (result.affectedRows == 1) {
            return done(false, result);
        } else {
            return done(false, false); // no one meet the id
        }

    });
};


/**
 * Handles a client's 'Get User' HTML request. Logs the user onto the server by generating an authentication token and giving it to the user, if the credentials
 *  supplied by the user are valid.
 * @param req the body of the request
 * @param done Callback function which handles the SQL database response
 * @returns {*} the callback function 'done'
 */
exports.login = function(req, done) {

    let data;
    try { data = validateJSON(req); }     // check req body is JSON
    catch (err) { return done(err); } // do we get returned now?

    let username = data.username, email = data.email, password = data.password, user_id, user_token, sql, values;
    if (username === undefined && !(password === undefined) && emailvalidator.validate(email)) {
        sql = "SELECT user_id from auction_user where user_email = ? and user_password = ?";
        values = [email, password];
    } else if ((email === undefined || (!(username === undefined)) && !(password === undefined) && emailvalidator.validate(email)) ) {
        sql = "SELECT user_id from auction_user where user_username = ? and user_password = ?";
        values = [username, password];
    } else { // password is undefined
        return done("ERROR");
    }
    db.get_pool().query(sql, values, function (err, result) { // check user credentials
        if (err) return done(false, false);
        if (result.length == 1) { // query returned one row
            user_id = result[0].user_id;
            let mw = tokens({ password: password, salt: crypto.randomBytes(16) }); // create token
            user_token = mw.getToken({ id: user_id });
            user_token = user_token.substring(0, 24);
            user_token+= user_id;
            db.get_pool().query("UPDATE auction_user SET user_token = '"+ user_token +"' WHERE user_id = ?", user_id, function (err) {
                if (err) {
                    return done(false, false);
                }
                return done(false, {'id': user_id, 'token': user_token});
            });
        } else { return done(true, false); } // user was not in database or 2+ users with same email and password
    });
};


/**
 * Handles a client's 'Logout' HTML request.
 * @param token the current user's authentication token
 * @param done Callback function which handles the SQL database response
 * @returns {*} the callback function 'done'
 */
exports.remove = function(token, done) {
    sql = "UPDATE auction_user SET user_token = null WHERE user_token = ?";
    db.get_pool().query(sql, [token], function(err, result) {
        if (err) {
            return done(false, false)
        }
        return done(result);
    })

};
