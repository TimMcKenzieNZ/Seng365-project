/**
 * Database Connector program which creates and stores connections to the MYSQL database.
 */

const mysql = require('mysql');
const fs = require('fs-extra');
const path = require('path');

/**
 * Variable to store the pool of mysql connections
 * @type {{pool: null}} A mySQL connection pool
 */
let state = {
    pool: null
}



/**
 * Connects to the MySQL3 database, where the default port is 3306. The connection is to the student tam94 profile tables.
 * @param done
 */
exports.connect = function(done) {
    state.pool = mysql.createPool({
        multipleStatements: true,
        host: process.env.SENG365_MQL_HOST || 'mysql3.csse.canterbury.ac.nz',
        port: process.env.SENG365_MQL_PORT || 3306,
        user: 'tam94',
        password: "79576300",
        database: "tam94"
    });
    done();
};



/**
 * Getter for the connection pool
 * @returns {null} Returns the MYSQL connection pool
 */
exports.get_pool = function() {
    return state.pool;
};



/**
 * Generates the data tables that the Server will be using by loading preconfigured SQL CREATE TABLE statements and executing them. Also resets the photos
 * Stored in the 'uploads' directory.
 * @param done Callback function to execute when the server replies to handle returned success or returned error.
 */
exports.generateTables = function (done) {
    let sql = fs.readFileSync('./sql_files/createdb.txt').toString();
    exports.get_pool().query(sql, function (err, result) {
        if (err) return done(err);
        fs.readdir('./uploads/', function(err, files) {
            if (err) {
                return done (false, false); // server error = 500
            }
            for (const file of files) {
                let stats = fs.statSync(path.join('./uploads/' , file));
                if (stats.isFile()) {
                    fs.unlink(path.join('./uploads/', file), function(err, result) {
                        if (err) {
                            return done (false, false); // server error = 500
                        }
                    });
                }
            }
            return done(false,true); // all photos cleared
        });
    });
};



/**
 * Populates the database tables with sample data by issuing a prepared SQL statement stored in the 'sql_files' directory.
 * @param done Callback function to execute when the server replies to handle returned success or returned error.
 * @returns {*}
 */
exports.populateTables = function (done) {
    try {
        let sql = fs.readFileSync('./sql_files/populatedb.txt').toString();
        exports.get_pool().query(sql, function (err, result)
        {
            if (err) return done(err, false); // Something went wrong executing the SQL statement
            return done(false, result);
        });
    } catch (err) {
        return done(false, false) // file was missing = 500
    }

};



