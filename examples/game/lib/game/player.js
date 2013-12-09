define(['backbone'],function(Backbone){

    var ACCELERATION = 150;
    var DECELERATION = 75;
    var MAX_VELOCITY =  500;

    var SIZE = 20;



    var Player = Backbone.Model.extend({

        defaults : {
            posX : 0,
            posY : 0,
            angle :0,
            angle2 : 0,
            velocity : 0,
            velocity2 : 0,
            isAccelerating : false,
            acceleration : ACCELERATION,
            deceleration : DECELERATION,
            size : SIZE
        },

        initialize : function(){
            //Internal timestamp of last update
            this._lastUpdated = new Date().getTime();
        },

        update : function(){
            var currentTime = new Date().getTime();
            var data = this.attributes;

            //Calculate deltas based on how much time has passed since last update
            var deltaSeconds = (currentTime - this._lastUpdated)/1000;

            var velocity =  data.isAccelerating ? Math.min(data.velocity + (data.acceleration*deltaSeconds),MAX_VELOCITY) :
                                                  Math.max(data.velocity - (data.deceleration*deltaSeconds), 0) ;

            var velocity2 =  Math.max(data.velocity2-(data.deceleration*deltaSeconds), 0);

            var posX = data.posX;
            var posY = data.posY;

            //Update player position based on their current velocity
            if (velocity> 0){
                posX += Math.cos(data.angle) * velocity * deltaSeconds;
                posY += Math.sin(data.angle) * velocity * deltaSeconds;
            }

            //Update player position based on their former velocity
            if (data.velocity2  > 0){
                posX += Math.cos(data.angle2) * velocity2 * deltaSeconds;
                posY += Math.sin(data.angle2) * velocity2 * deltaSeconds;
            }



            //Update attributes
            this.set({posX:posX, posY:posY, velocity:velocity, velocity2:velocity2});


            //Update last updated timestamp
            this._lastUpdated = currentTime;
        },


        setNewAngle : function(angle){

            var data = this.attributes;

            //Ignore minor angle changes
            if (Math.abs(angle - data.angle) >= 0.3){

                this.update();

                //If we don't have a current velocity we can skip most of the logic
                if (data.velocity == 0){
                    this.set({angle:angle, velocity:0});
                }
                else{
                    var angle2, velocity2;

                    //The new former velocity is going to be an average of the old former and the old current
                    if (data.velocity2 > 0){

                        var velocityX = (Math.cos(data.angle) * data.velocity) + (Math.cos(data.angle2) * data.velocity2);
                        var velocityY = (Math.sin(data.angle) * data.velocity) + (Math.sin(data.angle2) * data.velocity2);

                        angle2 = Math.atan2(velocityY, velocityX);
                        velocity2 = Math.abs(Math.sqrt((velocityX*velocityX)+(velocityY*velocityY)));
                    }
                    else{
                        angle2 = data.angle;
                        velocity2 = data.velocity;
                    }
                    this.set({angle:angle, velocity:0, angle2:angle2, velocity2:velocity2});
                }
            }
        },

        startAccelerating : function(){
            this.update();
            this.set("isAccelerating",true);
        },

        stopAccelerating : function(){
            this.update();
            this.set("isAccelerating",false);
        }
    });


    return Player;
});