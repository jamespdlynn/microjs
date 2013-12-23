define(['model/zone'],function(Zone){

    var canvas, currentAngle, mouseDown, updateTimeout;

    var requestAnimationFrame =  (function() {
       return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
       function(callback) {
           window.setTimeout(callback, 1000 / 60);
       };
    })();

    var GameView = {

        isRunning : function(){
           return gameData.get("isRunning");
        },

        //Set up Game View
        initialize : function(){

            canvas = document.getElementById("canvas");
            canvas.width = Zone.prototype.WIDTH;
            canvas.height =  Zone.prototype.HEIGHT;

            //Add a listener on our global gameData object, to know when our game starts/stops
            gameData.on("change:isRunning", function(model, value){
                if (value){
                    //Add Canvas Event Listeners and Start Game Loop
                    canvas.addEventListener('mousemove', onMouseMove);
                    canvas.addEventListener('mousedown', onMouseDown);
                    canvas.addEventListener('mouseup', onMouseUp);
                    canvas.addEventListener('mouseout', onMouseUp);
                    GameView.onFrame();
                }
                else{
                    //Remove Canvas Event Listeners and Clear Canvas
                    canvas.removeEventListener('mousemove', onMouseMove);
                    canvas.removeEventListener('mousedown', onMouseDown);
                    canvas.removeEventListener('mouseup', onMouseUp);
                    canvas.removeEventListener('mouseout', onMouseUp);
                    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
                }
            });

            GameView.onFrame();
        },

        onFrame : function(){
            if (GameView.isRunning()){
                GameView.render();
                requestAnimationFrame(GameView.onFrame);
            }
        },

        //Render this game's data onto the canvas
        render : function(){
            var context = canvas.getContext("2d");
            context.clearRect(0, 0, canvas.width, canvas.height);

            var players = gameData.currentZone.players;

            for (var i=0; i < players.length; i++){

                var player = players.models[i].update();  //Update this player's coordinates
                var display = getDisplayData(player);  //Get the display data

                //Draw player
                context.save();
                context.translate(display.posX,display.posY);
                context.rotate(display.angle+(Math.PI/2));
                context.beginPath();
                context.moveTo(0, -display.radius);
                context.lineTo(display.radius, display.radius);
                context.lineTo(-display.radius, display.radius);
                context.lineTo(0, -display.radius);
                context.fillStyle = display.color;
                context.fill();
                context.restore();
            }

            var data = gameData.player.attributes;

            context.font = "11px sans-serif";
            context.fillStyle = '#FFFFFF';
            context.fillText("posX: "+display.posX, 10, canvas.height-120);
            context.fillText("posY: "+display.posY, 10, canvas.height-100);
            context.fillText("angle: "+data.angle, 10, canvas.height-80);
            context.fillText("velocity: "+data.velocity, 10, canvas.height-60);
            context.fillText("Auxiliary Angles: "+JSON.stringify(data.auxiliaryAngles), 10, canvas.height-40);
            context.fillText("Auxiliary Velocities: "+JSON.stringify(data.auxiliaryVelocities), 10, canvas.height-20);
        }
    };



    //Canvas Event Listeners
    function onMouseDown(evt){
        mouseDown = true;
        onMouseMove(evt);
    }

    function onMouseUp(evt){
       mouseDown = false;
       onMouseMove(evt);
    }

    function onMouseMove(evt){

        //Calculate the angle in relation to the user player
        var rect = canvas.getBoundingClientRect();
        var player = gameData.player;

        var deltaX = evt.clientX - rect.left - player.get("posX");
        var deltaY = evt.clientY - rect.left - player.get("posY");


        if (Math.abs(deltaX) > player.SIZE || Math.abs(deltaY) > player.SIZE){
            currentAngle = Math.atan2(deltaY, deltaX);
        }

        //Don't update this angle straight away, rather wait a few milliseconds first (prevents triggering way too many player updates)
        updateTimeout = updateTimeout || setTimeout(triggerUpdate, 200);
    }

    function triggerUpdate(){
        //Set the user player's new data according to the user's interaction with the canvas
        gameData.player.set({angle:currentAngle, isAccelerating:mouseDown});
        if (gameData.player.hasChanged()){
            //Trigger a change:player event to have the updated data sent to the server
            gameData.trigger("change:player");
        }

        //Reset variables
        currentAngle = undefined;
        updateTimeout = undefined;
    }

    //Calculates and retrieves player display data (display data may be slightly different than actual data, as it allows for smoothing)
    function getDisplayData(player){

        var isUser = player.id === gameData.get("playerId");
        var data = player.attributes;
        var display = player.display = (player.display || {angle : data.angle, radius : player.SIZE/2});

        //Smooth angle angle updates, by incrementing the change in steps
        if (isUser && currentAngle){
           display.angle = currentAngle;
        }

        else if (display.angle != data.angle){
            var deltaAngle = angleDiff(data.angle, display.angle);
            if (deltaAngle > 0.1){
                var step = deltaAngle > 0.4 ? deltaAngle/4 : 0.1;
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

        //Round position values (helps prevent aliasing when drawing on the canvas)
        display.posX = Math.round(data.posX);
        display.posY = Math.round(data.posY);

        //Set color depending on whether this player is the current user
        display.color = isUser ? "#00BF13" : "D10B08";

        return display;
    }

    //Calculates the delta between two angles
    function angleDiff(angle1, angle2){
        var deltaAngle = angle1-angle2;
        while (deltaAngle < -Math.PI) deltaAngle += (2*Math.PI);
        while (deltaAngle > Math.PI) deltaAngle -= (2*Math.PI);
        return Math.abs(deltaAngle);
    }

    return GameView;
});