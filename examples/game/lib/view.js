define(['model/Zone'],function(Zone){

    var requestAnimationFrame =  (function() {
       return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
       function(callback) {
           window.setTimeout(callback, 1000 / 60);
       };
    })();

    var canvas;

    var GameView = {

        isRunning : function(){
           return gameData.get("isRunning");
        },

        initialize : function(){

            canvas = document.getElementById("canvas");
            canvas.width = Zone.prototype.WIDTH;
            canvas.height =  Zone.prototype.HEIGHT;

            canvas.addEventListener('mousemove', onMouseMove);
            canvas.addEventListener('mousedown', onMouseDown);
            canvas.addEventListener('mouseup', onMouseUp);
            canvas.addEventListener('mouseout', onMouseOut);

            gameData.on("change:isRunning", function(){
                onFrame();
            });

            onFrame();
        },

        reset : function(){
            gameData.off("change:isRunning");
            gameData.set("isRunning", false);

            canvas.removeEventListener('mousemove', onMouseMove);
            canvas.removeEventListener('mousedown', onMouseDown);
            canvas.removeEventListener('mouseup', onMouseUp);
            canvas.removeEventListener('mouseout', onMouseOut);

            var context = canvas.getContext("2d");
            context.clearRect(0, 0, canvas.width, canvas.height);

            canvas = undefined;
        }
    };

    function onFrame(){
        if (GameView.isRunning()){
            render();
            requestAnimationFrame(onFrame);
        }
    }

    function render(){

        var context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);

        var currentZone = gameData.currentZone;

        for (var i=0; i < currentZone.players.length; i++){

            context.save();

            var player = currentZone.players.at(i);
            player.update();

            var display = getDisplayData(player);

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

        var data = gameData.player.attributes;

        context.font = "11px sans-serif";
        context.fillStyle = '#FFFFFF';
        context.fillText("posX: "+String(data.posX).substring(0,5), 10, canvas.height-120);
        context.fillText("posY: "+String(data.posY).substring(0,5), 10, canvas.height-100);
        context.fillText("angle: "+String(data.angle).substring(0,4), 10, canvas.height-80);
        context.fillText("velocity: "+String(data.velocity).substring(0,5), 10, canvas.height-60);
        context.fillText("angle2: "+String(data.angle2).substring(0,4), 10, canvas.height-40);
        context.fillText("velocity2: "+String(data.velocity2).substring(0,5), 10, canvas.height-20);
    }

    var mouseX, mouseY, timeout;

    function onMouseMove(evt){

        if (GameView.isRunning())
        {
            var rect = canvas.getBoundingClientRect();
            mouseX = (evt.clientX - rect.left);
            mouseY = (evt.clientY - rect.top);

            if (!timeout){
                var time = Math.min(gameData.get("latency"),100);
                timeout = setTimeout(onTimeout, time);
            }
        }
    }

    function onTimeout(){
        var data = gameData.player.attributes;

        var deltaX = mouseX - data.posX ;
        var deltaY = mouseY - data.posY;

        if (Math.abs(deltaX) > gameData.player.SIZE || Math.abs(deltaY) > gameData.player.SIZE){
            gameData.player.setNewAngle(Math.atan2(deltaY, deltaX));
        }

        timeout = undefined;
    }


    function onMouseDown(){
        if (GameView.isRunning()){
            gameData.player.startAccelerating();
        }
    }

    function onMouseUp(){
        if (GameView.isRunning()){
            gameData.player.stopAccelerating();
        }
    }

    function onMouseOut(){
        if (GameView.isRunning()){
            gameData.player.stopAccelerating();
        }
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