define(['game/zone'],function (Zone){
   var zone = Zone.getInstance();

   var canvas = document.getElementById('canvas');
   canvas.width = Zone.WIDTH;
   canvas.height = Zone.HEIGHT;

   var context = canvas.getContext('2d');

   var onFrame =  (function(callback) {
       return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
       function(callback) {
           window.setTimeout(callback, 1000 / 60);
       };
   })();

    function render(){

       context.clearRect(0, 0, canvas.width, canvas.height);


        for (var i=0; i < zone.players.length; i++){
            var data = zone.players.at(i).attributes;
            var radius = data.size/2;

            context.save();
            context.translate(data.posX,data.posY);
            context.rotate(data.angle+(Math.PI/2));
            context.beginPath();
            context.moveTo(0, -radius);
            context.lineTo(radius, radius);
            context.lineTo(-radius, radius);
            context.lineTo(0, -radius);
            context.fillStyle = '#FFFFFF';
            context.fill();
            context.restore();
        }

        onFrame(function(){
            zone.update();
            render();
        });
    }

    return {

        run : function(){
            render();

            canvas.addEventListener('mousemove', function(evt) {

                if (!zone.myPlayer ) return;

                var rect = canvas.getBoundingClientRect();

                var clientX = evt.clientX - rect.left;
                var clientY = evt.clientY - rect.top;

                var data = zone.myPlayer.attributes;

                if (Math.abs(clientY-data.posY) > data.size || Math.abs(clientX-data.posX) > data.size){
                    var angle  = Math.atan2(clientY-data.posY, clientX-data.posX);

                    if (Math.abs(data.angle-angle) > 0.1){
                        zone.myPlayer.set("angle", angle);
                    }
                }


            }, false);

            canvas.addEventListener('mousedown', function() {
                if (!zone.myPlayer ) return;
                zone.myPlayer.set("isAccelerating", true);
            });

            canvas.addEventListener('mouseup', function() {
                if (!zone.myPlayer ) return;
                zone.myPlayer.set("isAccelerating", false);
            });

            canvas.addEventListener('mouseout', function() {
                if (!zone.myPlayer ) return;
                zone.myPlayer.set("isAccelerating", false);
            });
        }
    };



});