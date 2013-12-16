define('client', ['browser-buffer', 'microjs', 'model/schemas', 'model/zone'],

    function (Buffer, micro, schemas, Zone){

        var WebSocket = window.WebSocket || window.MozWebSocket;

        micro.register(schemas);

        return {

            run : function(){

                var socket = new WebSocket( "ws://"+window.location.host, 'microjs');

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

                function readData (raw){

                    var dataObj = micro.toJSON(new Buffer(raw));

                    switch (dataObj._type){
                        case "Ping":
                            socket.send(raw); //On a Ping just resend the exact same data
                            break;

                        case "GameData" :
                            gameData.set(dataObj);
                            gameData.set("isRunning", gameData.currentZone.players.length);
                            break;

                        case "Zone":
                            gameData.set("currentZone", dataObj);
                            gameData.set("isRunning", gameData.currentZone.players.length);
                            break;

                        case "Player":
                            gameData.currentZone.set("players", [dataObj]);
                            break;
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