define(['browser-buffer', 'microjs', 'model/schemas', 'model/zone', 'model/Player'],
    function (Buffer, micro, schemas, Zone, Player){

        var WebSocket = window.WebSocket || window.MozWebSocket;
        var socket, currentZone, latency = 0;

        var Client = {

            run : function(){

                //Register Schemas
                micro.register(schemas);

                //Connect websocket to server and begin listening for messages
                socket = new WebSocket( "ws://"+window.location.host, "microjs");
                socket.onmessage = function(evt) {
                    //Use fileReader to parse out returned Blob Data into Array Buffer
                    var fileReader = new FileReader();
                    fileReader.onload = function(){
                        readData(this.result);
                    };
                    fileReader.readAsArrayBuffer(evt.data);
                };
                socket.onclose = function(){
                    console.log("Websocket closed");
                    gameData.off("change:player",onUserPlayerChange);
                    gameData.reset();
                    socket = undefined;
                };

                gameData.on("change:player", onUserPlayerChange);
            },

            stop : function(){
                socket.close();
            }
        };

        //Handle data received from server
        function readData(raw){

            var dataObj = micro.toJSON(new Buffer(raw));
            var type = dataObj._type;

            delete dataObj._type;

            switch (type){
                case "Ping":
                    //Grab latency (if exists) and bounce back the exact same data packet
                    latency = dataObj.latency || latency;
                    socket.send(raw);
                    break;

                case "GameData" :
                    //Initialize the game data and update the each of the zone's player data according to latency
                    gameData.set(dataObj);
                    currentZone = gameData.currentZone.update(latency);
                    break;

                case "Zone":
                    //Use dummy Zone Model to first update the data values according to latency
                    dataObj = new Zone(dataObj).update(latency).toJSON();
                    //Set easing to true so we don't simply override each existing player's x,y coordinates
                    currentZone.set(dataObj, {easing:true, silent:true});
                    break;

                case "Player":
                    //Use dummy Player Model to update the data values according to latency
                    dataObj = new Player(dataObj).update(latency).toJSON();
                    //Set easing to true so we don't simply override this player's x,y coordinates (if they exist)
                    currentZone.players.set(dataObj, {easing:true, remove:false, silent:true});
                    break;

                case "PlayerUpdate":
                    //A player update contains minimal player information, so we don't need to worry about easing
                    currentZone.players.set(dataObj, {add:false, remove:false, silent:true});
                    break;

                default:
                    console.warn("Unknown schema type received: "+type);
                    break;
            }
        }

        //When a user player change event is caught, send a "PlayerUpdate" to the server
        function onUserPlayerChange(data){

            var player = gameData.player;
            data.angle = data.angle.toPrecision(1);

            //Check if data contains different values
            if (player.get("angle") !== data.angle || player.get("isAccelerating") !== data.isAccelerating){
                var buffer = micro.toBinary(data, "PlayerUpdate");
                socket.send(buffer);

                console.log(latency);
                //Wait until sending this data to the player, in order to allow for latency
                setTimeout(function(){
                    player.set(data);
                }, latency);
            }
        }

        return Client;

    }
);

