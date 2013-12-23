define(['backbone'],function(Backbone){

    Number.prototype.toPrecision = function(precision){
        var multiplier = Math.pow(10, precision);
        return  Math.round(this * multiplier) /multiplier;
    }

    var Player = Backbone.Model.extend({

        //Constants
        SIZE : 25,  // px
        MAX_VELOCITY : 200, // px/s
        ACCELERATION : 100,  // px/s^2
        DECELERATION : 50,

        defaults : {
            posX : 0,
            posY : 0,
            angle :0,
            velocity : 0,
            isAccelerating : false
        },

        initialize : function(){
            //Internal timestamp of last update
            this.lastUpdated = new Date().getTime();
            this.initialized = true;

            this.attributes.auxiliaryAngles = this.attributes.auxiliaryAngles || [0];
            this.attributes.auxiliaryVelocities = this.attributes.auxiliaryVelocities ||  [0];
        },

        /*** @override*/
        set: function(key, val, options) {

            if (!this.initialized){
                return Backbone.Model.prototype.set.call(this, key, val, options);
            }

            if (key == null) return this;
            var attrs;
            if (typeof key === 'object') {
                attrs = key; options = val;
            } else {
                (attrs = {})[key] = val;
            }

            if (attrs.hasOwnProperty("angle")){

                attrs.angle = attrs.angle.toPrecision(1);

                var currentAngle = this.get("angle");
                var currentVelocity = this.get("velocity");

                if (currentAngle !== attrs.angle){

                    //Reset velocity to min velocity
                    if (!attrs.hasOwnProperty("velocity")){
                       attrs.velocity = 0;
                    }

                    if (!attrs.hasOwnProperty("auxiliaryAngles")){
                        var auxiliaryAngles = this.get("auxiliaryAngles");
                        var auxiliaryVelocities = this.get("auxiliaryVelocities");

                        var auxiliaryData = addAngles(currentAngle, currentVelocity, auxiliaryAngles[0], auxiliaryVelocities[0]);
                        auxiliaryAngles[0] = auxiliaryData.angle.toPrecision(1);
                        auxiliaryVelocities[0] = auxiliaryData.velocity;
                    }
                }
            }

            if (options && options.easing){
                var posX = attrs.posX,
                    posY = attrs.posY;

                delete attrs.posX;
                delete attrs.posY;

                Backbone.Model.prototype.set.call(this, attrs, options);

                return this.ease(posX, posY);
            }

            return Backbone.Model.prototype.set.call(this, attrs, options);
        },

        update : function(deltaTime){

            var currentTime = new Date().getTime();
            var data = this.attributes;

            if (!deltaTime){
                deltaTime = currentTime - this.lastUpdated;
            }

           //Calculate deltas based on how much time has passed since last update
           var deltaSeconds = deltaTime/1000;

           data.velocity =  data.isAccelerating ? Math.min(data.velocity + (this.ACCELERATION*deltaSeconds),this.MAX_VELOCITY) :
                                                  Math.max(data.velocity - (this.DECELERATION*deltaSeconds), 0);


           if (data.velocity > 0){
               data.posX += (Math.cos(data.angle) * data.velocity * deltaSeconds);
               data.posY += (Math.sin(data.angle) * data.velocity * deltaSeconds);
           }

          for (var i=0; i < data.auxiliaryAngles.length;i++){

              var angle = data.auxiliaryAngles[i];
              var velocity = data.auxiliaryVelocities[i] - (this.DECELERATION*deltaSeconds);

              if  (velocity > 0){
                  data.posX += (Math.cos(angle) * velocity * deltaSeconds);
                  data.posY += (Math.sin(angle) * velocity * deltaSeconds);
                  data.auxiliaryVelocities[i] = velocity;
              }else{
                  data.auxiliaryVelocities[i] = 0;
              }
          }

          var radius = this.SIZE/2;

          if (data.posX > this.ZONE_WIDTH+radius){
             data.posX -= (this.ZONE_WIDTH+radius);
          }else if (data.posX < -radius){
             data.posX += (this.ZONE_WIDTH+radius);
          }

          if (data.posY > this.ZONE_HEIGHT+radius){
             data.posY -= (this.ZONE_HEIGHT+radius);
          }else if (data.posY < -radius){
             data.posY += (this.ZONE_HEIGHT+radius);
          }

          //Update last updated timestamp
          this.lastUpdated = currentTime;

          return this;
        },

        //Calculate the angel and velocity needed to get player to this position
        ease : function(posX, posY){

            this.update();

            var deltaX = posX - this.get("posX");
            if (Math.abs(deltaX) > this.ZONE_WIDTH/2){
                (posX < this.ZONE_WIDTH/2) ? deltaX += this.ZONE_WIDTH : deltaX -= this.ZONE_WIDTH;
            }

            var deltaY = posY - this.get("posY");
            if (Math.abs(deltaY) > this.ZONE_HEIGHT/2){
                (posY < this.ZONE_HEIGHT/2) ? deltaY += this.ZONE_HEIGHT : deltaY -= this.ZONE_HEIGHT;
            }

            var distance = Math.sqrt((deltaX*deltaX)+(deltaY*deltaY));

            if (distance > this.SIZE/4){
                var angle = Math.atan2(deltaY, deltaX);
                var velocity = Math.sqrt(2*this.DECELERATION*distance);

                var auxiliaryAngles = this.get("auxiliaryAngles");
                var auxiliaryVelocities = this.get("auxiliaryVelocities");

                auxiliaryAngles[1] = angle.toPrecision(1);
                auxiliaryVelocities[1] = velocity.toPrecision(2);
            }

            return this;
        }
    });


    function addAngles(a1, v1, a2, v2){

        var velocityX = (Math.cos(a1) * v1) + (Math.cos(a2) * v2);
        var velocityY = (Math.sin(a1) * v1) + (Math.sin(a2) * v2);


        var angle= Math.atan2(velocityY, velocityX);
        var velocity =  Math.sqrt((velocityX*velocityX)+(velocityY*velocityY));

        return {angle:angle, velocity:velocity};
    }


    return Player;
});