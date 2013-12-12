define(['websocket', 'microjs', 'model/schemas','model/game','model/zone'], function(websocket, micro, schemas, GameData, Zone){

   var WebSocketServer = websocket.server;

   micro.register(schemas);

   var MAX_CONNECTIONS = 10;

   return {
       run : function(httpServer){
           var id = 1,
               connections = [];

           var wsServer = new WebSocketServer({
               httpServer: httpServer,
               autoAcceptConnections: false
           });

           var zone = new Zone();

           wsServer.on('request', function(request){

               if (connections.length >= MAX_CONNECTIONS){
                   return;
               }

               var origin = request.origin;
               var connection =  request.accept('echo-protocol', origin);
               var gameData = new GameData({
                   currentZone : zone
               });

               id = (id%255) + 1; //Increment current id (while making sure it never exceeds a byte)

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
                   connections.push(connection);
                   gameData.set({
                       player : zone.createPlayer(),
                       initialized : true
                   })
               }

               function destroy(){
                   connections.splice(connections.indexOf(connection), 1);
                   zone.players.remove(gameData.get("player"));
                   gameData.destroy();

                   connection = undefined;
                   gameData = undefined;
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

                           gameData.set("latency",sumLatency / length);

                           var initialized = gameData.get("initialized");

                           if (!initialized){
                               initialize();
                               send(connection, 'GameData', gameData.toJSON());
                           }
                           else{
                               send(connection,  'GameData', gameData.toJSON(), 2); //send only latency
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