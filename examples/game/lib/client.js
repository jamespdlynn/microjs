define(['microjs','game/schemas'], function (micro, schemas){

    WebSocket = WebSocket || MozWebSocket;

    micro.register(schemas);

    return {

        run : function(){

            var url = "ws://" + window.location.host;
            var socket = new WebSocket(url, 'echo-protocol');

            socket.onmessage = function(evt) {
                console.log("RESPONSE!");

                console.log(evt.data);

                var fileReader = new FileReader();
                fileReader.onload = function() {
                    var data = micro.toJSON(new Buffer(this.result));
                    switch (data._packet.type){
                        case "Ping":
                            socket.send(this.result);
                            break;

                        case "PlayerInfo" :
                            console.log("PlayerInfo Received! : "+data.playerId);
                            break;
                    }
                };
                fileReader.readAsArrayBuffer(evt.data);
            };

            socket.onerror = function(err) {
                console.log('WebSocket error: '+ err);
            };
        }
    };

});