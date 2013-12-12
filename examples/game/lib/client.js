define(['browser-buffer','microjs','model/schemas','model/zone'], function (Buffer, micro, schemas, Zone){

    var WebSocket = window.WebSocket || window.MozWebSocket;
    var url = "ws://" + window.location.host;

    var socket, latency;

    micro.register(schemas);

    return {

        run : function(){

            socket = new WebSocket(url, 'echo-protocol');

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
        }
    };

    function readData(raw){

        var dataObj = micro.toJSON(new Buffer(raw));

        var currentZone = gameData.get("currentZone");

        switch (dataObj._packet.type){
            case "Ping":
                socket.send(raw); //On a Ping just resend the exact same data
                break;

            case "Player":
                if (currentZone){
                    currentZone.players.set(dataObj);
                }
                break;

            case "Zone":
                if (currentZone){
                    currentZone.players.set(dataObj.players);
                }
                break;

            case "GameData" :
                latency = dataObj.latency;

                if (dataObj.currentZone){
                    var zone = new Zone(dataObj.currentZone);
                    var player = zone.players.get(dataObj.playerId);

                    gameData.set({
                        currentZone : zone,
                        player : player,
                        initialized : true
                    });
                }
            break;
        }
    }

});