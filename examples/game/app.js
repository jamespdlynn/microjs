// Micro JS Game Example
// (c) 2010-2011 James Lynn <james.lynn@aristobotgames.com>, Aristobot LLC.

var http = require("http"),
    express = require("express"),
    path = require('path'),
    requirejs = require('requirejs');

//Use require js from here on out to load our modules instead of node's require function.
//This will allow us to share some of the same modules both client and server side.
requirejs.config({
    baseUrl : __dirname+"/lib",
    nodeRequire : require,
    //Setting a path to microjs is unnecessary when we have microjs included a node module
    paths : {
        'microjs' : path.join(__dirname, '../../lib/micro')
    }
});

//Use requires optimizer to build a single 'main' file to our public directory for the client to run
requirejs.optimize({
        baseUrl : __dirname+"/lib",
        name : 'main',
        paths : {
            'microjs' : path.join(__dirname, '../../lib/micro'),
            'browser-buffer' : path.join(__dirname, '../../lib/browser-buffer'),
            'underscore' : path.join(require.resolve('backbone'), '../node_modules/underscore/underscore'),
            'backbone' : path.join(require.resolve('backbone'), '../backbone')
        },
        shim : {
            'backbone': {
                deps: ['underscore'],
                exports: 'Backbone'
            },
            'underscore':{
                exports : '_'
            }
        },
        findNestedDependencies : true,
        out : path.join(__dirname, "/public/main.js"),
        optimize : 'uglify2'
    },

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

var port = process.argv[2] || process.env.PORT || 3000;
var httpServer = http.createServer(app).listen(port, function(){
    console.log('Express server listening on port ' +port);
});

requirejs(["server"], function(server){
    server.run(httpServer);
});

