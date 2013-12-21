define(['backbone'],function(Backbone){


    var Player = Backbone.Model.extend({

        //Constants
        ACCELERATION : 75,
        DECELERATION : 25,
        MAX_VELOCITY : 225,
        SIZE : 20,

        defaults : {
            posX : 0,
            posY : 0,
            angle :0,
            angle2 : 0,
            velocity : 0,
            velocity2 : 0,
            isAccelerating : false
        },

        initialize : function(){
            //Internal timestamp of last update
            this._lastUpdated = new Date().getTime();
        },

        /*** @override*/
        set: function(key, val, options) {

            if (key == null) return this;
            var attrs;
            if (typeof key === 'object') {
                attrs = key; options = val;
            } else {
                (attrs = {})[key] = val;
            }

            if (attrs.hasOwnProperty("posX")){
                attrs.posX = toPrecision(attrs.posX,6);
            }

            if (attrs.hasOwnProperty("posY")){
                attrs.posY = toPrecision(attrs.posY,6);
            }

            if (attrs.hasOwnProperty("velocity")){
                attrs.velocity = toPrecision(attrs.velocity,2);
            }

            if (attrs.hasOwnProperty("velocity2")){
                attrs.velocity2 = toPrecision(attrs.velocity2,2);
            }

            if (attrs.hasOwnProperty("angle")){

                attrs.angle = toPrecision(attrs.angle,1);

                if (!attrs.hasOwnProperty("angle2")){

                    var angle = attrs.angle;
                    var data = this.attributes;

                    //If we don't have a current velocity we can skip most of the logic
                    if (data.velocity > 0){

                        attrs.velocity = 0;

                        //The new former velocity is going to be an average of the old former and the old current
                        if (data.velocity2 > 0){

                            var velocityX = (Math.cos(data.angle) * data.velocity) + (Math.cos(data.angle2) * data.velocity2);
                            var velocityY = (Math.sin(data.angle) * data.velocity) + (Math.sin(data.angle2) * data.velocity2);

                            attrs.angle2 = toPrecision(Math.atan2(velocityY, velocityX), 1);
                            attrs.velocity2 =  toPrecision(Math.abs(Math.sqrt((velocityX*velocityX)+(velocityY*velocityY))), 2);
                        }
                        else{
                            attrs.angle2 = data.angle;
                            attrs.velocity2 = data.velocity;
                        }


                    }
                }
            }



            return Backbone.Model.prototype.set.call(this, attrs, options);
        },

        update : function(timeOffset){

            timeOffset = timeOffset || 0;

            var currentTime = new Date().getTime();
            var data = this.attributes;

            //Calculate deltas based on how much time has passed since last update
            var deltaSeconds = (currentTime - this._lastUpdated + timeOffset)/1000;

            var velocity =  data.isAccelerating ? Math.min(data.velocity + (this.ACCELERATION*deltaSeconds),this.MAX_VELOCITY) :
                                                  Math.max(data.velocity - (this.ACCELERATION*deltaSeconds), 0) ;

            var velocity2 =  Math.max(data.velocity2-(this.DECELERATION*deltaSeconds), 0);

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
        }
    });



    function toPrecision(value, precision){
        return Number(value.toFixed(precision));
    }

    return Player;
});