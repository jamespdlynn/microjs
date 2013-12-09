define(['websocket', 'microjs', 'game/schemas','game/zone'], function(websocket, micro, schemas, zone){

   var WebSocketServer = websocket.server;

   micro.register(schemas);

   return {
       run : function(httpServer){
           var id = 1,
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
                       parseData(data);
                   }
                   catch (e){
                       console.log(e);
                   }

               });

               connection.on('close', function(reasonCode, description) {
                   console.log((new Date()) + ' Connection from origin ' + origin + ' closing.' + reasonCode + " : " + description);
                   destroy();
               });

               function initialize(){
                   player = zone.createPlayer(playerId);
                   connections.push(connection);
                   initialized = true;
               }

               function destroy(){
                   connections.splice(connections.indexOf(connection), 1);
                   zone.players.remove(player);
               }

               function parseData(data){

                   switch (data._packet.type)
                   {
                       case 'Ping' :

                           if (data.timestamps.length <= 3){
                               ping(data);
                               break;
                           }

                           var length = data.timestamps.length;
                           var sumLatency = 0;
                           for (var i = 1; i < length; i++){
                               sumLatency += (data.timestamps[i] - data.timestamps[i-1])/2;
                           }
                           latency = sumLatency / length;


                           if (!initialized){
                               initialize();
                               send(connection, 'GameData', {latency : latency, playerId: playerId, zone: zone.toJSON()});
                           }
                           else{
                               send(connection,  'GameData', {latency : latency}, 2); //send only latency
                           }
                           break;
                   }
               }

               function ping(data){
                   data = data || {timestamps:[]};
                   data.timestamps.push(new Date().getTime());

                   send(connection, "Ping", data);
               }

               ping();

           });
       }
   };


   function send(connection,schemaName,data,byteLength){
       var buffer = micro.toBinary(data, schemaName,byteLength);
       connection.sendBytes(buffer);

       micro.toJSON(buffer);
   }

});