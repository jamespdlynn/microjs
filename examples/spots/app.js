var http = require("http"),
    express = require("express"),
    micro = require("../../lib/micro");
    WebSocketServer = require("websocket").server;

//Use Express to define our HTTP Server
var app = express();
app.use(express.logger('dev'));
app.use(express.errorHandler());
app.use(express.static(__dirname+"/public"));

var port = process.argv[2] || process.env.PORT ||  3000;
httpServer = http.createServer(app).listen(port,function(){
    console.log('Express server listening on port ' +port);
});

//Register our schemas
var activeUsersSchema = {
    count: "uint8"
};

var spotSchema = {
    posX : "ufloat16",
    posY : "ufloat16",
    radius : "uint8",
    color : {
        type: "object",
        schema:{R:"uint8", G:"uint8",B:"uint8"}
    }
};

micro.register(activeUsersSchema, "ActiveUsers");
micro.register(spotSchema, "Spot");

var MAX_CONNECTIONS = 255;
var connections = [];

//Create a new Websocket Server Instance
var wsServer = new WebSocketServer({
    httpServer: httpServer,
    autoAcceptConnections: false
});

//When a new client connects
wsServer.on('request', function(request){

    if (connections.length >= MAX_CONNECTIONS){
        return request.reject(403, "Max Clients Reached");
    }

    //Accept the new connection and save it to our global array
    var connection =  request.accept('microjs', request.origin);
    connections.push(connection);
    console.log((new Date()) + ' Connection from origin ' + request.origin + ' accepted.');

    //Serialize the new active users count and send it to all connected clients
    var buffer = micro.toBinary({count:connections.length}, "ActiveUsers");
    var i = connections.length;
    while (i--){
        connections[i].send(buffer);
    }

    //Packet received from connection
    connection.on('message', function(msg) {
        if (msg.type == 'binary'){
            //Simply relay this data on to all connected clients for them to handle
            var i = connections.length;
            while (i--){
                connections[i].send(msg.binaryData);
            }
        }
    });

    //Connection closed
    connection.on('close', function(reasonCode, description) {

        console.log((new Date()) + ' Connection from origin ' + request.origin + ' closing.' + reasonCode + " : " + description);

        //Remove this connection from our global array
        connections.splice(connections.indexOf(connection), 1);
        connection = undefined;

        //Serialize the new active users count and send it to all connected clients
        var buffer = micro.toBinary({count:connections.length},"ActiveUsers");
        var i = connections.length;
        while (i--){
            connections[i].send(buffer);
        }
    });
});






