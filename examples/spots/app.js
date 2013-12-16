var http = require("http"),
    express = require("express"),
    micro = require("../../lib/micro");
    WebSocketServer = require("websocket").server;


var app = express();
app.use(express.logger('dev'));
app.use(express.errorHandler());
app.use(express.static(__dirname+"/public"));

var httpServer = http.createServer(app),
    port = process.env.PORT || 3000;


httpServer.listen(port, function(){

    var MAX_CONNECTIONS = 255;
    var connections = [];

    micro.register({
        count: "uint8"
    }, "ActiveUsers");

    micro.register({
        posX : "ufloat16",
        posY : "ufloat16",
        radius : "uint8",
        color : {
            type: "object",
            schema:{R:"uint8", G:"uint8",B:"uint8"}
        }
    }, "Spot");

    var wsServer = new WebSocketServer({
        httpServer: httpServer,
        autoAcceptConnections: false
    });

    wsServer.on('request', function(request){

        if (connections.length >= MAX_CONNECTIONS){
            return;
        }

        var connection =  request.accept('microjs', request.origin);
        console.log((new Date()) + ' Connection from origin ' + request.origin + ' accepted.');

        //Send the new active user number to all users
        connections.push(connection);
        for (var i=0; i < connections.length; i++){
            var buffer = micro.toBinary({count:connections.length}, "ActiveUsers");
            connections[i].send(buffer);
        }

        connection.on('message', function(msg) {
            if (msg.type == 'binary'){
                //Simply relay this data on to all existing connections
                for (var i=0; i < connections.length; i++){
                    connections[i].send(msg.binaryData);
                }
            }
        });

        connection.on('close', function(reasonCode, description) {
            console.log((new Date()) + ' Connection from origin ' + request.origin + ' closing.' + reasonCode + " : " + description);

            connections.splice(connections.indexOf(connection), 1);
            for (var i=0; i < connections.length; i++){
                var buffer = micro.toBinary({count:connections.length},"ActiveUsers");
                connections[i].send(buffer);
            }

            connection = undefined;
        });
    });

    console.log('Express server listening on port ' +port);
});






