define(['backbone'],function(Backbone){

    var ACCELERATION = 100;
    var MAX_VELOCITY =  500;

    var SIZE = 20;

    var Player = Backbone.Model.extend({

        defaults : {
            posX : 0,
            posY : 0,
            angle :0,
            velocity : 0,
            isAccelerating : false,
            acceleration : ACCELERATION,
            size : SIZE
        },

        initialize : function(){
            this.lastUpdated = new Date().getTime();
        },

        update : function(){
            var currentTime = new Date().getTime();
            var data = this.attributes;

            if (!data.isAccelerating && data.velocity == 0){
                this.lastUpdated = currentTime;
                return;
            }

            var deltaSeconds = (currentTime - this.lastUpdated)/1000;
            var deltaVelocity = data.acceleration*deltaSeconds;

            if (data.isAccelerating){
                data.velocity = Math.min(data.velocity+deltaVelocity, MAX_VELOCITY);
            }else{
                data.velocity = Math.max(data.velocity-deltaVelocity, 0);
            }

            var deltaPos = data.velocity*deltaSeconds;
            data.posX += Math.cos(data.angle) * deltaPos;
            data.posY += Math.sin(data.angle) * deltaPos;

            this.lastUpdated = currentTime;
        }

    });


    return Player;
});