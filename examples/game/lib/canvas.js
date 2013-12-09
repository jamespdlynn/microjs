define(['game/zone'],function (zone){

    var canvas = document.getElementById('canvas');
    canvas.width = zone.width;
    canvas.height =  zone.height;

    var context = canvas.getContext('2d');

    var onFrame =  (function(callback) {
       return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
       function(callback) {
           window.setTimeout(callback, 1000 / 60);
       };
    })();

    var Game = {

        isPlaying : false,

        play : function(){

            if (Game.isPlaying) return;

            canvas.addEventListener('mousemove', onMouseMove);
            canvas.addEventListener('mousedown', onMouseDown);
            canvas.addEventListener('mouseup', onMouseUp);
            canvas.addEventListener('mouseout', onMouseOut);

            Game.isPlaying = true;

            Game.render();
        },

        pause : function(){
            if (!Game.isPlaying) return;

            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('mouseout', onMouseOut);

            Game.isPlaying  = false;
        },

        render : function(){

            if (!Game.isPlaying) return;

            context.clearRect(0, 0, canvas.width, canvas.height);

            var players = zone.players.models;

            for (var i=0; i < players.length; i++){

                var player = players[i];
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

            if (zone.myPlayer){
                var data = zone.myPlayer.attributes;

                context.font = "11px sans-serif";
                context.fillStyle = '#FFFFFF';
                context.fillText("posX: "+String(data.posX).substring(0,3), 10, canvas.height-120);
                context.fillText("posY: "+String(data.posY).substring(0,3), 10, canvas.height-100);
                context.fillText("angle: "+String(data.angle).substring(0,4), 10, canvas.height-80);
                context.fillText("velocity: "+String(data.velocity).substring(0,5), 10, canvas.height-60);
                context.fillText("angle2: "+String(data.angle2).substring(0,4), 10, canvas.height-40);
                context.fillText("velocity2: "+String(data.velocity2).substring(0,5), 10, canvas.height-20);
            }

            onFrame(function(){
                Game.render();
            });
        }
    };

    function onMouseMove(evt){
        if (zone.myPlayer){
            var data = zone.myPlayer.attributes;
            var rect = canvas.getBoundingClientRect();

            var deltaX = (evt.clientX - rect.left) - data.posX ;
            var deltaY = (evt.clientY - rect.top) - data.posY;

            if (Math.abs(deltaX) > data.size || Math.abs(deltaY) > data.size){
                zone.myPlayer.setNewAngle(Math.atan2(deltaY, deltaX));
            }
        }
    }

    function onMouseDown(){
        if (zone.myPlayer)  zone.myPlayer.startAccelerating();
    }

    function onMouseUp(){
        if (zone.myPlayer)  zone.myPlayer.stopAccelerating();
    }

    function onMouseOut(){
        if (zone.myPlayer)  zone.myPlayer.stopAccelerating();
    }

    //Calculates display data (display data may be slightly different than actual data, as it allows for smoothing)
    function getDisplayData(player){

        var data = player.attributes;

        if (!player.display){
            return player.display = {angle:data.angle, posX: data.posX, posY:data.posY, radius:data.size/2};
        }

        var display = player.display;

        if (display.angle != data.angle){
            var deltaAngle = angleDiff(data.angle, display.angle);
            if (deltaAngle > 0.1){
                var step = deltaAngle > 0.3 ? deltaAngle/3 : 0.1;
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

        if (display.posX != data.posX){
            var deltaX = Math.abs(data.posX - display.posX);
            if (deltaX > 1){
                if (deltaX > zone.width/2){
                    display.posX = (data.posX > zone.width/2) ? zone.width : 0;
                }
                else{
                    var step = deltaX > 3 ? deltaX/3 : 1;
                    display.posX = (data.posX > display.posX) ? display.posX+step : display.posX-step;
                }
            }
            else{
                display.posX = data.posX;
            }
        }

        if (display.posY != data.posY){
            var deltaY = Math.abs(data.posY - display.posY);
            if (deltaY > 1){
                if (deltaY > zone.height/2){
                    display.posY = (data.posY > zone.height/2) ? zone.height : 0;
                }
                else{
                    var step = deltaY > 3 ? deltaY/3 : 1;
                    display.posY = (data.posY > display.posY) ? display.posY+step : display.posY-step;
                }
            }
            else{
                display.posY = data.posY;
            }
        }

        return display;
    }

    function angleDiff(angle1, angle2){
        var deltaAngle = angle1-angle2;
        while (deltaAngle < -Math.PI) deltaAngle += (2*Math.PI);
        while (deltaAngle > Math.PI) deltaAngle -= (2*Math.PI);
        return Math.abs(deltaAngle);
    }

    return Game;
});