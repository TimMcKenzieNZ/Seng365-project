/**
 * Sets up the express application.
 * @type {module.exports|*|(function(): app)}
 */


const express = require('express'),
    bodyParser = require('body-parser');


/**
 * Initiates the express library and imports the routes the application will be using.
 * @returns {app} the express application
 */
module.exports = function(){
    const app = express();

    app.use(bodyParser.json()); // Forces the body of HTML requests and responses to be of JSON data type
    require('../app/routes/database.server.routes.js')(app);
    require('../app/routes/users.server.routes.js')(app);
    require('../app/routes/auction.server.routes.js')(app);
    require('../app/routes/photos.server.routes.js')(app);

    return app;

};

