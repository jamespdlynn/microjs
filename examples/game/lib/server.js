define(['websocket', 'microjs', 'game/schemas','game/zone'], function(websocket, micro, schemas, Zone){

   var WebSocketServer = websocket.server;
   var zone = Zone.getInstance();

   micro.register(schemas);

   return {
       run : function(httpServer){
           var id = 0,
               connections = [];

           var wsServer = new WebSocketServer({
               httpServer: httpServer,
               autoAcceptConnections: false
           });

           wsServer.on('request', function(request){

               var origin = request.origin;
               var connection =  request.accept('echo-protocol', origin);
               var playerId = id++;

               var player, latency, initialized = false;

               connection.on('message', function(msg) {

                   if (msg.type !== 'binary') return;

                   try{
                       var data = micro.toJSON(msg.binaryData);

                       switch (data._packet.type){
                           case 'Ping' :

                               if (data.timestamps.length < 4){
                                   data.timestamps.push(new Date().getTime());
                                   send(connection, 'Ping', data);
                                   break;
                               }

                               var length = data.timestamps.length;
                               var sumLatency = 0;
                               for (var i = 1; i < length; i++){
                                   sumLatency += (data.timestamps[i] - data.timestamps[i-1])/2;
                               }

                               latency = sumLatency / length;

                               if (!initialized){
                                   player = zone.createPlayer(playerId);
                                   send(connection, 'Zone', zone.toJSON());

                                   connections.push(connection);
                                   initialized = true;
                               }

                               send(connection,  'PlayerInfo', {playerId : playerId, latency : latency});

                               break;
                       }
                   }
                   catch (e){
                       console.log(e);
                   }


               });

               connection.on('close', function(reasonCode, description) {
                   console.log((new Date()) + ' Connection from origin ' + origin + ' closing.' + reasonCode + " : " + description);
                   connections.splice(connections.indexOf(connection), 1);
                   zone.players.remove(player);
               });


               send(connection, "Ping", {timestamps : [new Date().getTime()]} );
           });
       }
   };


   function send(connection,schemaName,data){
       var buffer = micro.toBinary(data, schemaName);
       connection.sendBytes(buffer);

       micro.toJSON(buffer);
   }

});