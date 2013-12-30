define(["websocket", "microjs", "model/schemas","model/zone","model/constants"], function(websocket, micro, schemas, Zone, Constants){

    var WebSocketServer = websocket.server;

    //Constants
    var MAX_CONNECTIONS = 10;
    var MAX_PINGS = 5;
    var FAKE_LATENCY = 0; //milliseconds (used for local debugging only)

    /**
     * @constructor
     * A Server Zone Class used to manage all player connections within a given zone
     * For this example there is only instance used
     */
    var ServerZone = function (){
        // Incrementing id field, to give unique identification for new players
        this.currentId = 0;
        // Used to keep track of all of this instance's connected users
        this.connections = [];
        //The attached model instance
        this.zone = new Zone();
        //A pointer to the update loop
        this.updateInterval = undefined;
    };

    /**
     * Add a new connection to the Zone and create a new corresponding player
     * @param {object} conn
     * @returns {number}
     */
    ServerZone.prototype.add = function(conn){

        //Increment current id (while making sure it never exceeds one byte)
        this.currentId = (this.currentId%255) + 1;

        //Create this player, with a random position and random angle
        var player = this.zone.players.add({
            id : this.currentId,
            posX : Math.random() * this.zone.WIDTH,
            posY : Math.random() * this.zone.HEIGHT,
            angle : (Math.random() * (Math.PI * 2)) - Math.PI
        });


        //Send this new player data to existing connections
        for (var i = 0; i < this.connections.length; i++){
            send(this.connections[i], "Player", player.toJSON());
        }

        //Add new connection to array
        conn.id = this.currentId;
        this.connections.push(conn);

        //Send all the necessary game data to the new user, to get them started
        send(conn,  "GameData", {
            playerId:player.id,
            currentZone:this.zone.toJSON(),
            isRunning:true
        });

        //Start the zone update loop if necessary
        if (!this.updateInterval){
            this.startUpdateLoop();
        }

        return this.currentId;
    };


    /**
     * Removes the given connection and its corresponding player from the Zone
     * @param {object} conn
     * @returns {number}
     */
    ServerZone.prototype.remove = function(conn){

       this.zone.players.remove(conn.id);
       this.connections.splice(this.connections.indexOf(conn), 1);

       //If no more connections, stop the update loop
       if (this.connections.length == 0){
           this.stopUpdateLoop();
       }
       return conn.id;
    };

    /**
     * Updates a player using the given data, while relaying to object to all other client connections
     * @param {object} data PlayerUpdate data
     */
    ServerZone.prototype.updatePlayer = function(data){

        //Update player data
        var player = this.zone.players.get(data.id).update();
        player.set(data);

        //Pass changes for other connections to implement
        if (player.hasChanged()){
            for (var i=0; i < this.connections.length; i++){
                var connection = this.connections[i];
                //We don't need to send this data to the connection that triggered this update
                if (connection.id !== player.id){
                    send(connection, "PlayerUpdate", data);
                }
            }
        }
    };

    /**
     * Starts the update loop, which at certain intervals updates the all the zone's data and sends it to our connections
     */
    ServerZone.prototype.startUpdateLoop = function(){

        var self = this;

        this.updateInterval = setInterval(function(){
            //Update Zone
            self.zone.update();

            for (var i=0; i < self.connections.length; i++){
                send(self.connections[i], "Zone", self.zone.toJSON());
            }

        },Constants.UPDATE_INTERVAL);
    };

    /**
     * Stops and clears the update loop
     */
    ServerZone.prototype.stopUpdateLoop = function(){
        clearInterval(this.updateInterval);
        this.updateInterval = undefined;
    };


    return {

       run : function(httpServer){

           //Register our schemas
           micro.register(schemas);

           //Create a new ServerZone instance
           var serverZone = new ServerZone();

           //Create a new WebsocketServer Instance
           var wsServer = new WebSocketServer({
               httpServer: httpServer,
               autoAcceptConnections: false
           });

           //When a new connection request is received from a client
           wsServer.on("request", function(request){

               //Make sure we haven't exceeded our maximum number of connections
               if (serverZone.connections.length >= MAX_CONNECTIONS){
                   request.reject(403, "Max number of connections reached");
                   return;
               }

               //Accept the connection
               var connection =  request.accept("microjs", request.origin);
               //Keep track of whether this connection has been added to our server zone
               var initialized = false;

               //When a data packet is received from the client
               connection.on("message", function(msg) {

                   if (msg.type !== "binary") return;

                   //try{
                      if (FAKE_LATENCY){
                          setTimeout(function(){
                             readData(msg.binaryData);
                          }, FAKE_LATENCY);
                      }else{
                          readData(msg.binaryData);
                      }
                   //}
                   //catch(e){
                      //console.warn("Unable to parse binary data: "+ e.message);
                   //}
               });

               //When the client terminated the websocket connections
               connection.on("close", function(){
                   if (initialized){
                       serverZone.remove(connection);
                   }
                   connection = undefined;
               });

               //Parse client sent binary data buffer
               var readData = function(buffer){

                   //Deserialize binary data into a JSON object
                   var data = micro.toJSON(buffer);
                   var type = data._type;
                   delete data._type;

                   switch (type)
                   {
                       case "Ping" :
                           var numPings = data.timestamps.length;

                           //Ping a minimum of number of times, before calculating the latency
                           if (numPings < MAX_PINGS){
                               ping(data);
                           }
                           else if (numPings == MAX_PINGS){
                               //Calculate this connections average latency and send it to the client
                               data.latency = calculateLatency(data.timestamps);
                               console.log(data.latency);
                               ping(data);

                               //If we haven't initialized yet, add this connection to the server zone
                               if (!initialized){
                                   serverZone.add(connection);
                                   initialized = true;
                               }
                           }

                           break;

                       case "PlayerUpdate":
                           //Set the player update id to the connection id to prevent clients from updating other players
                           data.id = connection.id;
                           serverZone.updatePlayer(data);
                           break;

                       default:
                           console.warn("Unexpected Schema Type Received: "+type);
                           break;
                   }
               };

               //Kick off the connection by pinging the client
               var ping = function(data){
                   data = data || {timestamps:[]};
                   data.timestamps.push(new Date().getTime());
                   send(connection, "Ping", data);
               };

               ping();
           });

        }
    };


    /**
     * Helper function that serializes a JSON data object according to a given schema,
     * and then sends it through a given client connection
     * @param {object} conn
     * @param {string} schemaName
     * @param {object} json
     * @param {number} [byteLength]
     */
    function send(conn,schemaName,json,byteLength){

      var buffer = micro.toBinary(json, schemaName,byteLength);

      if (FAKE_LATENCY){
          setTimeout(function(){
              conn.sendBytes(buffer);
          },FAKE_LATENCY);
      }else{
         conn.sendBytes(buffer);
      }
    }


    /**
     * Helper function that calculates the latency by getting the average of all the ping timestamps differences
     * @param {Array.<number>} timestamps
     * @returns {number}
     */
    function calculateLatency(timestamps){
        var length = timestamps.length,
            sumLatency = 0;

        for (var i = 1; i < length; i++){
            sumLatency += (timestamps[i] - timestamps[i-1])/2;
        }

        return (sumLatency/(length-1));
    }

});