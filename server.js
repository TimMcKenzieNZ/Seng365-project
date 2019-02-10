/**
 * Imports necessary libraries into the application and initiates the server.
 */


const
    db = require('./config/db'), // For connecting to the MYSQL database
    express = require('./config/express');


var app = express();


/**
 * On start up the app connects to the MWSQL database and resets its tables of data and fills them again.
 */
db.connect(function(err) {
    if (err) {
        console.log('Unable to connect to MYSQL.');
        process.exit(1);
    } else { // Enforcing code blocking here to ensure database tables are created, THEN populated, BEFORE listening to the port.
        db.generateTables(function(){
            db.populateTables(function(){
                app.listen(4941, function () {
                    console.log('Example app listening on container port 4941!')
                });
            });
        });
    }
});


/**
 * Standard Hello World function :)
 */
app.get('/', function (req, res) {
    res.send({"message": "Hello World!"})
});


