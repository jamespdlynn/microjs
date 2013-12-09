define(['browser-buffer','microjs','game/schemas','game/zone'], function (Buffer, micro, schemas, zone){

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
        var players = zone.players;


        switch (dataObj._packet.type){
            case "Ping":
                socket.send(raw); //On a Ping just resend the exact same data
                break;

            case "Player":
                players.set(dataObj);
                break;

            case "Zone":
                players.set(dataObj.players);
                break;

            case "GameData" :
                latency = dataObj.latency;

                if (dataObj.zone){
                    players.set(dataObj.zone.players);
                }

                if (dataObj.playerId){
                    zone.myPlayer = players.get(dataObj.playerId);
                }

                break;
        }
    }

});