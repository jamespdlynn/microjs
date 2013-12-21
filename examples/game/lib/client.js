define('client', ['browser-buffer', 'microjs', 'model/schemas', 'model/zone'],

    function (Buffer, micro, schemas, Zone){

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
                socket.onerror = function(err) {
                    console.log('WebSocket error: '+ err);
                };

                gameData.on("player:update", onPlayerUpdate);

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
                            gameData.currentZone.set(dataObj);
                            gameData.currentZone.update(latency);
                            break;

                        case "Player":
                        case "PlayerUpdate":
                            gameData.currentZone.players.set([dataObj]);
                            gameData.currentZone.update(latency);
                            break;

                        default:
                            console.warn("Unknown schema type received: "+dataObj._type);
                            break;
                    }
                }

                function onPlayerUpdate(){
                    if (gameData.player && gameData.player.hasChanged()){
                        var buffer = micro.toBinary(gameData.player.toJSON(), "PlayerUpdate");
                        socket.send(buffer);
                    }
                }

            }
        };

    }
);

//Main require function
require(['model/game','view','client'], function(GameData, GameView, Client){
    //Create global game data object
    window.gameData = new GameData();

    GameView.initialize();
    Client.run();
});