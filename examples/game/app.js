var http = require("http"),
    express = require("express"),
    path = require('path'),
    requirejs = require('requirejs');

/**
 * We're replacing node modular loader with requirejs at this point,
 * because with require js we can load the same modules both server and client side
 */
var config = {
    baseUrl : __dirname+"/lib",
    paths : {
        'microjs' : '../vendor/micro',
        'browser-buffer' : '../vendor/browser-buffer'
    },
    nodeRequire : require,

    name : 'main',
    findNestedDependencies:true,
    out : __dirname+'/public/main.js',
    optimize : 'none' //Optimize is set to 'none' here for development purposes
};

//Configure requirejs for loading modules server side
requirejs.config(config);

//Use requires optimizer to build a single 'main' file containing all our modules, to be loaded client side
requirejs.optimize(config,
    function(buildResponse){
        console.log("Require JS Build Successful: "+buildResponse);
    },
    function (err){
        console.log("Require JS Build Failed: "+err);
    }
);


var app = express();
app.use(express.logger('dev'));
app.use(express.errorHandler());
app.use(express.static(__dirname+"/public"));

var httpServer = http.createServer(app),
    port = process.env.PORT || 3000;

requirejs(["server"], function(server){

    httpServer.listen(port, function(){
        console.log('Express server listening on port ' +port);
    });

    server.run(httpServer);
});

