/**
 * Model code to handle all Database related HTML requests
 */


/**
 * Imports the database controller for making MYSQL connections
 */
const db = require('../../config/db');


/**
 * Calls database model method generateTables to build table schema for remote mysql database.
 * @param done Callback function which handles the SQL database response
 * @returns {*} the callback function 'done'
 */
exports.resetTables = function(done){
    db.generateTables(function (err, result) {
        if (err) return done(false, false); // called if generateTables fails.
        return done(result);
    });
};


/**
 * Calls database model method populateTables to populate sample data into table schema for remote mysql database.
 * @param done Callback function which handles the SQL database response
 * @returns {*} the callback function 'done'
 */
exports.respawnTables = function(done){
    db.populateTables(function (err, result) {
        if (err) return done(false, false);
        return done(result);
    });
};


