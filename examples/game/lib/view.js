define(['model/zone'],function(Zone){

    var canvas, currentAngle, mouseDown, frameCount = 0;

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

            frameCount = 0;

            if (GameView.isRunning()){
                run();
            }

            //Add a listener on our global gameData object, to know when our game starts/stops
            gameData.on("change:isRunning", function(model, value){
                value ? run() : reset();
            });
        }
    };


    function run(){
        //Add Canvas Event Listeners
        canvas.addEventListener('mousemove', onMouseMove);
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mouseup', onMouseUp);
        canvas.addEventListener('mouseout', onMouseUp);

        onFrame();   //Start Game Loop
    }

    function reset (){
        //Remove Canvas Event Listeners
        canvas.removeEventListener('mousemove', onMouseMove);
        canvas.removeEventListener('mousedown', onMouseDown);
        canvas.removeEventListener('mouseup', onMouseUp);
        canvas.removeEventListener('mouseout', onMouseUp);

        //Clear Canvas
        canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    }

    //Game Loop
    function onFrame(){
        if (!GameView.isRunning()) return;

        //Every ten frames trigger a player update
        if (++frameCount >= 10){
            if (currentAngle){
                gameData.trigger("change:player", {angle:currentAngle, isAccelerating:mouseDown});
                currentAngle = undefined;
            }
            frameCount = 0;
        }

        render(); //Render the canvas
        requestAnimationFrame(onFrame);
    }

    function render(){
        var context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height); //Clear canvas

        var players = gameData.currentZone.players;

        //Loop through all players in current zone
        var i = players.length;
        while (i--){

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

        //Draw current user player attributes
        context.font = "11px sans-serif";
        context.fillStyle = '#FFFFFF';
        context.fillText("PosX: "+Math.round(data.posX), 10, canvas.height-100);
        context.fillText("PosY: "+Math.round(data.posY), 10, canvas.height-80);
        context.fillText("Angle: "+data.angle, 10, canvas.height-60);
        context.fillText("Velocity: "+Math.round(data.velocity), 10, canvas.height-40);
        context.fillText("Auxiliary Angles: "+JSON.stringify(data.auxiliaryAngles), 10, canvas.height-20);
    }


    //Canvas Event Listeners
    function onMouseDown(evt){
        onMouseMove(evt);
        mouseDown = true;
    }

    function onMouseUp(evt){
       onMouseMove(evt);
       mouseDown = false;
    }

    function onMouseMove(evt){

        //Calculate the angle in relation to the user player
        var rect = canvas.getBoundingClientRect();
        var player = gameData.player;

        var deltaX = evt.clientX - rect.left - player.get("posX");
        var deltaY = evt.clientY - rect.top - player.get("posY");

        if (Math.abs(deltaX) > player.SIZE || Math.abs(deltaY) > player.SIZE){
            currentAngle = Math.atan2(deltaY, deltaX);
        }
    }

    //Calculates and retrieves player display data (display data may be slightly different than actual data, as it allows for smoothing)
    function getDisplayData(player){

        var isUser = player.id === gameData.get("playerId");
        var data = player.attributes;
        var display = player.display = (player.display || {angle : data.angle, radius : player.SIZE/2});

        //For user player use unofficial 'currentAngle' if available, rather than their data angle
        var angle = (isUser && currentAngle) ? currentAngle : data.angle;

        //Smooth angle changes, by incrementing them in steps
        if (display.angle != angle){
            var deltaAngle = angleDiff(angle, display.angle);
            if (deltaAngle > 0.1){
                var step = deltaAngle > 0.3 ? deltaAngle/6 : 0.05;
                if (angleDiff(angle, display.angle+step) < deltaAngle){
                    display.angle += step;
                }else{
                    display.angle -= step;
                }
            }
        }

        //Round position values (helps prevent aliasing when drawing on the canvas)
        display.posX = Math.round(data.posX);
        display.posY = Math.round(data.posY);

        //Set color depending on whether this player is the current user
        display.color = isUser ? "#00BF13" : "#D10B08";

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