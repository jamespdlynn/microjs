define(['websocket', 'microjs', 'game/schemas'], function(websocket, micro, schemas){
   var WebSocketServer = websocket.server;

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
               var latency;
               var initialized = false;


               connection.on('message', function(msg) {

                   if (msg.type !== 'binary') return;

                   try{
                       var data = micro.toJSON(msg.binaryData);

                       switch (data._packet.type){
                           case 'Ping' :

                               if (data.timestamps.length < 4){
                                   data.timestamps.push(new Date().getTime());
                                   send(data, 'Ping', connection);
                                   break;
                               }

                               var length = data.timestamps.length;
                               var sumLatency = 0;
                               for (var i = 1; i < length; i++){
                                   sumLatency += (data.timestamps[i] - data.timestamps[i-1])/2;
                               }

                               latency = sumLatency / length;

                               if (!initialized){
                                   connections.push(connection);
                                   initialized = true;
                               }

                               send({playerId : playerId, latency : latency}, 'PlayerInfo', connection);

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
               });


               send({timestamps : [new Date().getTime()]}, "Ping", connection);
           });
       }
   };

   function send(data, schemaName, connection){
       var buffer = micro.toBinary(data, schemaName);
       connection.sendBytes(buffer);
   }

});