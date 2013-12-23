define(['browser-buffer', 'microjs', 'model/schemas', 'model/zone', 'model/Player'],
    function (Buffer, micro, schemas, Zone, Player){

        var WebSocket = window.WebSocket || window.MozWebSocket;
        return {

            run : function(){

                micro.register(schemas);

                var latency = 0;

                var socket = new WebSocket( "ws://"+window.location.host, "microjs");
                socket.onmessage = function(evt) {
                    var fileReader = new FileReader();
                    fileReader.onload = function(){
                        readData(this.result);
                    };
                    fileReader.readAsArrayBuffer(evt.data);
                };
                socket.onclose = function(){
                    console.log('Websocket closed');
                    gameData.set("isRunning", false);
                }

                gameData.on("change:player", onUserPlayerChange);

                function readData(raw){

                    var dataObj = micro.toJSON(new Buffer(raw));

                    switch (dataObj._type){
                        case "Ping":
                            if (dataObj.latency){
                                latency = dataObj.latency;
                            }else{
                                socket.send(raw); //If latency hasn't been calculated yet, just return the packet
                            }
                            break;

                        case "GameData" :
                            gameData.set(dataObj);
                            gameData.currentZone.update(latency);
                            break;

                        case "Zone":
                            dataObj = new Zone(dataObj).update(latency).toJSON();
                            gameData.currentZone.set(dataObj, {easing:true});
                            break;

                        case "Player":
                            dataObj = new Player(dataObj).update(latency).toJSON();
                            gameData.currentZone.players.set(dataObj, {easing:true, remove:false});
                            break;

                        case "PlayerUpdate":
                            gameData.currentZone.players.set(dataObj, {add:false, remove:false});
                            break;

                        default:
                            console.warn("Unknown schema type received: "+dataObj._type);
                            break;
                    }
                }

                function onUserPlayerChange(){
                    if (gameData.player && gameData.player.hasChanged()){
                        var buffer = micro.toBinary(gameData.player.toJSON(), "PlayerUpdate");
                        socket.send(buffer);
                    }
                }

            }
        };

    }
);

