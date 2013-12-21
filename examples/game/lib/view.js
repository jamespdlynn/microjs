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
            canvas.removeEventListener('mouseout', onMouseUp);

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
        context.fillText("posX: "+data.posX, 10, canvas.height-120);
        context.fillText("posY: "+data.posY, 10, canvas.height-100);
        context.fillText("angle: "+data.angle, 10, canvas.height-80);
        context.fillText("velocity: "+data.velocity, 10, canvas.height-60);
        context.fillText("angle2: "+data.angle2, 10, canvas.height-40);
        context.fillText("velocity2: "+data.velocity2, 10, canvas.height-20);
    }

    var mouseX, mouseY, angleTimeout;
    function onMouseMove(evt){

        if (GameView.isRunning())
        {
            var rect = canvas.getBoundingClientRect();
            mouseX = (evt.clientX - rect.left);
            mouseY = (evt.clientY - rect.top);

            if (!angleTimeout){
                angleTimeout = setTimeout(function(){
                    var data = gameData.player.attributes;

                    var deltaX = mouseX - data.posX ;
                    var deltaY = mouseY - data.posY;


                    if (Math.abs(deltaX) > gameData.player.SIZE || Math.abs(deltaY) > gameData.player.SIZE){

                        var newAngle = Math.atan2(deltaY, deltaX);

                        //Ignore minor angle changes
                        if (Math.abs(newAngle - gameData.player.get("angle")) >= 0.2){
                            gameData.player.update();
                            gameData.player.set("angle", newAngle);
                            gameData.trigger("player:update");
                        }
                    }

                    angleTimeout = undefined;
                }, 50);
            }
        }
    }

    var accelerateTimeout;
    function onMouseDown(){
        if (GameView.isRunning() && !accelerateTimeout){

            accelerateTimeout = setTimeout(function(){
                gameData.player.update();
                gameData.player.set("isAccelerating", true);
                gameData.trigger("player:update");

                accelerateTimeout = undefined;
            }, 200);

            canvas.addEventListener('mouseup', onMouseUp);
            canvas.addEventListener('mouseout', onMouseUp);
        }
    }

    function onMouseUp(){
        if (accelerateTimeout){
            clearTimeout(accelerateTimeout);
            accelerateTimeout = undefined;
        }else{
            gameData.player.update();
            gameData.player.set("isAccelerating", false);
            gameData.trigger("player:update");
        }

        canvas.removeEventListener('mouseup', onMouseUp);
        canvas.removeEventListener('mouseout', onMouseUp);
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