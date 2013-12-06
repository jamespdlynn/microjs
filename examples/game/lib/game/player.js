define(['microjs'], function(micro){

    var Player = function(id){
        this.id = id;
        this.data = {
            posX : 5,
            posY : 5,
            angle : 1,
            velocity : 0,
            isAccelerating : false
        }
    };

    Player.prototype.update = function(){

        var delta = (Game.velocity + (this.acceleration * this.time)) * Game.interval;

        if (delta > 0){
            this.x += Math.cos(this.angle) * delta;
            this.y += Math.sin(this.angle) * delta;

            if (this.x > Game.board.width){
                this.x = 0;
            }else if (this.x < 0){
                this.x = Game.board.width;
            }

            if (this.y > Game.board.height){
                this.y = 0;
            }else if (this.y < 0){
                this.y = Game.board.height;
            }

            this.detectCollisons();

            this.time += Game.interval;
        }

    };


    Player.prototype.detectCollisons = function(){

        var r = Game.radius;

        for (var i=0; i < Game.players.length; i++){
            var player = Game.players[i];

            if (player.id == this.id ) continue;

            if (this.x+r > player.x-r && this.x-r < player.x+r && this.y+r > player.y-r && this.y-r < player.y+r){

                console.log("collision");

                var xd = player.x-this.x;
                var yd = player.y-this.y;
                var acceleration = player.acceleration;
                var time = player.time;

                player.angle = Math.atan2(yd, xd);
                player.acceleration = this.acceleration;
                player.time = this.time;

                this.angle = (this.angle <= 0) ? this.angle+Math.PI : this.angle-Math.PI;
                this.acceleration = acceleration;
                this.time = time;

                break;
            }
        }
    };

    Player.prototype.setAngle = function(x, y){
        var xd = x-this.x;
        var yd = y-this.y;
        var dist = Math.sqrt(Math.pow(Math.abs(xd),2) + Math.pow(Math.abs(yd),2)) * 2;

        this.angle  = Math.atan2(yd, xd);
        this.acceleration = -1 * (Math.pow(Game.velocity, 2)) / (2*dist);
        this.time = 0;
    };

    return Player;
});