var http = require("http"),
    express = require("express"),
    path = require('path'),
    requirejs = require('requirejs');

requirejs.config({
    baseUrl : __dirname+"/lib",
    nodeRequire : require,
    //This line is unneeded when we have microjs as a node module
    paths : {
        'microjs' : path.join(__dirname, '../../lib/micro')
    }
});

//Use requires optimizer to build a single 'main' file containing all our modules, to be loaded client side
requirejs.optimize({
        baseUrl : __dirname+"/lib",
        name : 'client',
        paths : {
            'microjs' : path.join(__dirname, '../../lib/micro'),
            'browser-buffer' : path.join(__dirname, '../../lib/browser-buffer'),
            'underscore' : path.join(require.resolve('backbone'), '../node_modules/underscore/underscore-min'),
            'backbone' : path.join(require.resolve('backbone'), '../backbone-min')
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
        optimize : 'none'
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

var httpServer = http.createServer(app),
    port = process.env.PORT || 3000;

requirejs(["server"], function(server){

    httpServer.listen(port, function(){
        console.log('Express server listening on port ' +port);
    });

    server.run(httpServer);
});

