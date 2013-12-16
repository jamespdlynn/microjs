define(["websocket", "microjs", "model/schemas","model/zone"], function(websocket, micro, schemas, Zone){

   var WebSocketServer = websocket.server;

   micro.register(schemas);

   var MAX_CONNECTIONS = 10;

   return {
       run : function(httpServer){

           var id = 1;
           var connections = [];
           var zone = new Zone();

           var wsServer = new WebSocketServer({
               httpServer: httpServer,
               autoAcceptConnections: false
           });

           wsServer.on("request", function(request){

               if (connections.length >= MAX_CONNECTIONS){
                   return;
               }

               var origin = request.origin;
               var connection =  request.accept("microjs", origin);

               var player;

               id = (id%255) + 1; //Increment current id (while making sure it never exceeds a byte)
               ping();

               connection.on("message", function(msg) {

                   if (msg.type == "binary"){
                       //try{
                           readData(msg.binaryData);
                       //}
                       //catch (e){
                       //    console.log(e);
                       //}
                   }
               });

               connection.on("close", function() {
                   connections.splice(connections.indexOf(connection), 1);
                   zone.players.remove(player);

                   player = undefined;
                   connection = undefined;
               });


               function readData(binaryData){

                   var data = micro.toJSON(binaryData);

                   switch (data._type)
                   {
                       case "Ping" :

                           if (data.timestamps.length <= 3){
                               ping(data);
                               break;
                           }

                           var length = data.timestamps.length;
                           var sumLatency = 0;
                           for (var i = 1; i < length; i++){
                               sumLatency += (data.timestamps[i] - data.timestamps[i-1])/2;
                           }

                           var latency = sumLatency / length;

                           if (!player){
                               player = zone.createPlayer(id);
                               connections.push(connection);
                               send(connection,  "GameData", {latency:latency, playerId:player.id, currentZone:zone.toJSON()});
                           }
                           else{
                               send(connection,  "GameData", {latency:latency}, 2); //send only latency
                           }

                           break;
                   }
               }

               function ping(data){
                   data = data || {timestamps:[]};
                   data.timestamps.push(new Date().getTime());

                   send(connection, "Ping", data);
               }



           });
       }
   };


   function send(connection,schemaName,data,byteLength){
       var buffer = micro.toBinary(data, schemaName,byteLength);
       connection.sendBytes(buffer);

       micro.toJSON(buffer);
   }

});