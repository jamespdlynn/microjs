define(['browser-buffer','microjs','game/schemas','game/zone'], function (Buffer, micro, schemas, Zone){

    var WebSocket = window.WebSocket || window.MozWebSocket;
    var zone = Zone.getInstance();
    var url = "ws://" + window.location.host;

    var socket;

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

        switch (dataObj._packet.type){
            case "Ping":
                socket.send(raw); //On a Ping just resend the exact same data
                break;

            case "Player":
                console.log(JSON.stringify(dataObj));
                break;

            case "Zone":
                console.log(JSON.stringify(dataObj));
                zone.setPlayers(dataObj.players);
                break;

            case "PlayerInfo" :
                zone.myPlayer = zone.players.get(dataObj.playerId);
                break;
        }
    }

});