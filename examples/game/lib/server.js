define(["websocket", "microjs", "model/schemas","model/zone"], function(websocket, micro, schemas, Zone){

    var WebSocketServer = websocket.server;

    var MAX_CONNECTIONS = 10;
    var NUM_PINGS = 5;
    var UPDATE_INTERVAL = 500; //Half a second

    var ServerZone = function (){
        //Incrementing id field, to give unique identification for new players
        this.currentId = 0;
        //An array to keep track of all our connected users
        this.connections = [];
        //The zone containing our players (for this example there is onlyo ne)
        this.zone = new Zone();

        //A pointer to our zone update interval
        this.updateInterval = undefined;
    };

    ServerZone.prototype.add = function(conn){

        //Increment current id (while making sure it never exceeds a byte)
        conn.id = this.currentId = (this.currentId%255) + 1;

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
        this.connections.push(conn);

        //Send the all existing game data to the new user
        send(conn,  "GameData", {playerId:player.id, currentZone:this.zone.toJSON(), isRunning:true});

        //Start the zone update loop if necessary
        if (!this.updateInterval){
            var self = this;
            this.updateInterval = setInterval(function(){
               self.updateZone();
            }, UPDATE_INTERVAL);
        }

        return this.currentId;
    };

    ServerZone.prototype.remove = function(conn){
       this.zone.players.remove(conn.id);
       this.connections.splice(this.connections.indexOf(conn), 1);

       if (this.connections.length > 0){
           clearInterval(this.updateInterval);
           this.updateInterval = undefined;
       }
    };

    ServerZone.prototype.updatePlayer = function(data){

        var player = this.zone.players.get(data.id).update();
        player.set(data);

        if (player.hasChanged()){
            for (var i=0; i < this.connections.length; i++){
                var connection = this.connections[i];
                if (connection.id !== player.id){
                    send(connection, "PlayerUpdate", data);
                }

            }
        }
    };

    ServerZone.prototype.updateZone = function(){
        this.zone.update();

        for (var i=0; i < this.connections.length; i++){
            send(this.connections[i], "Zone", this.zone.toJSON());
        }
    };


    return {

       run : function(httpServer){

           micro.register(schemas);

           var serverZone = new ServerZone();

           var wsServer = new WebSocketServer({
               httpServer: httpServer,
               autoAcceptConnections: false
           });

           wsServer.on("request", function(request){

               if (serverZone.connections.length >= MAX_CONNECTIONS){
                   request.reject(403, "Max number of connections reached");
                   return;
               }

               //Accept the connection
               var connection =  request.accept("microjs", request.origin);
               var initialized = false;

               connection.on("message", function(msg) {

                   if (msg.type !== "binary"){
                        return;
                   }

                   //try{
                       var data = micro.toJSON(msg.binaryData);

                       switch (data._type)
                       {
                           case "Ping" :

                               //Ping a minimum of number of times, before calculating the latency
                               if (data.timestamps.length == NUM_PINGS){

                                   data.latency = calculateLatency(data.timestamps);

                                   //If we have not initialized yet kick that off
                                   if (!initialized){
                                       serverZone.add(connection);
                                       initialized = true;
                                   }
                               }

                               ping(connection, data);

                               break;

                           case "PlayerUpdate":
                               data.id = connection.id;
                               serverZone.updatePlayer(data);
                               break;

                           default:
                               console.log("Unexpected Schema Type: "+data._type);
                               break;
                       }
                   //}catch(e){
                      // console.log("Unable to parse binary data: "+ e.message);
                   //}
               });


               connection.on("close", function(){
                   if (initialized){
                       serverZone.remove(connection);
                   }
                   connection = undefined;
               });

               ping(connection); //Ping the client to get things started!
           });

        }
    };

    /**
     * @param {object} conn
     * @param {string} schemaName
     * @param {object} data
     * @param {number} [byteLength]
     */
    function send(conn,schemaName,data,byteLength){
      var buffer = micro.toBinary(data, schemaName,byteLength);
      conn.sendBytes(buffer);
    }


    /**
     * @param {object} conn
     * @param {object} [data]
     */
    function ping(conn, data){
        data = data || {timestamps:[]};


        if (data.timestamps.length <= NUM_PINGS){
            data.timestamps.push(new Date().getTime());
            send(conn, "Ping", data);
        }
    }

    /**
     * @param {Array.<number>} timestamps
     * @returns {number}
     */
    function calculateLatency(timestamps){
        //Calculate the latency by getting the average of all the pings
        var length = timestamps.length, sumLatency = 0;
        for (var i = 1; i < length; i++){
            sumLatency += (timestamps[i] - timestamps[i-1])/2;
        }

        return sumLatency / length;
    }



});