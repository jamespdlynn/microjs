define(function(){

    var canvas = document.getElementById('canvas');

    var onFrame =  (function(callback) {
       return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
       function(callback) {
           window.setTimeout(callback, 1000 / 60);
       };
    })();

    var context, zone, players, userPlayer;

    var GameView = {

        isPlaying : false,

        play : function(){

            if (GameView.isPlaying) return;

            context = canvas.getContext('2d');
            zone = gameData.get("currentZone");
            players = gameData.get("currentZone").get("players");
            userPlayer = gameData.get("player");

            canvas.width = zone.WIDTH;
            canvas.height =  zone.HEIGHT;

            canvas.addEventListener('mousemove', onMouseMove);
            canvas.addEventListener('mousedown', onMouseDown);
            canvas.addEventListener('mouseup', onMouseUp);
            canvas.addEventListener('mouseout', onMouseOut);

            GameView.isPlaying = true;
            GameView.render();
        },

        pause : function(){
            if (!GameView.isPlaying) return;

            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('mouseout', onMouseOut);

            GameView.isPlaying  = false;
        },

        render : function(){

            if (!GameView.isPlaying) return;

            context.clearRect(0, 0, canvas.width, canvas.height);

            for (var i=0; i < players.length; i++){

                var player = players.at(i);
                player.update();

                var display = getDisplayData(player);

                context.save();
                context.translate(display.posX,display.posY);
                context.rotate(display.angle+(Math.PI/2));

                context.beginPath();
                context.moveTo(0, -display.radius);
                context.lineTo(display.radius, display.radius);
                context.lineTo(-display.radius, display.radius);
                context.lineTo(0, -display.radius);

                context.fillStyle = '#FFFFFF';
                context.fill();

                context.restore();
            }

            var data = userPlayer.attributes;

            context.font = "11px sans-serif";
            context.fillStyle = '#FFFFFF';
            context.fillText("posX: "+String(data.posX).substring(0,5), 10, canvas.height-120);
            context.fillText("posY: "+String(data.posY).substring(0,5), 10, canvas.height-100);
            context.fillText("angle: "+String(data.angle).substring(0,4), 10, canvas.height-80);
            context.fillText("velocity: "+String(data.velocity).substring(0,5), 10, canvas.height-60);
            context.fillText("angle2: "+String(data.angle2).substring(0,4), 10, canvas.height-40);
            context.fillText("velocity2: "+String(data.velocity2).substring(0,5), 10, canvas.height-20);

            onFrame(function(){
                GameView.render();
            });
        }
    };

    var mouseX, mouseY, timeout;
    function onMouseMove(evt){

        var rect = canvas.getBoundingClientRect();
        mouseX = (evt.clientX - rect.left);
        mouseY = (evt.clientY - rect.top);

        if (!timeout){

            var time = Math.min(gameData.get("latency"),100);

            timeout = setTimeout(function(){
                var data = userPlayer.attributes;

                var deltaX = mouseX - data.posX ;
                var deltaY = mouseY - data.posY;

                if (Math.abs(deltaX) > userPlayer.SIZE || Math.abs(deltaY) > userPlayer.SIZE){
                    userPlayer.setNewAngle(Math.atan2(deltaY, deltaX));
                }

                timeout = undefined;
            }, time);
        }


    }

    function onMouseDown(){
        userPlayer.startAccelerating();
    }

    function onMouseUp(){
        userPlayer.stopAccelerating();
    }

    function onMouseOut(){
        userPlayer.stopAccelerating();
    }

    //Calculates display data (display data may be slightly different than actual data, as it allows for smoothing)
    function getDisplayData(player){

        var data = player.attributes;

        if (!player.display){
            return player.display = {angle:data.angle, posX: data.posX, posY:data.posY, radius:player.SIZE/2};
        }

        var display = player.display;
        var step;

        if (display.angle != data.angle){
            var deltaAngle = angleDiff(data.angle, display.angle);
            if (deltaAngle > 0.1){

                step = deltaAngle > 0.3 ? deltaAngle/3 : 0.1;
                if (angleDiff(data.angle, display.angle+step) < deltaAngle){
                    display.angle += step;
                }else{
                    display.angle -= step;
                }
            }
            else{
                display.angle = data.angle;
            }
        }

        display.posX = data.posX;
        display.posY = data.posY;



        return display;
    }

    function angleDiff(angle1, angle2){
        var deltaAngle = angle1-angle2;
        while (deltaAngle < -Math.PI) deltaAngle += (2*Math.PI);
        while (deltaAngle > Math.PI) deltaAngle -= (2*Math.PI);
        return Math.abs(deltaAngle);
    }

    return GameView;
});