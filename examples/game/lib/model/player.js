define(['backbone'],function(Backbone){

    Number.prototype.toPrecision = function(precision){
        var multiplier = Math.pow(10, precision);
        return  Math.round(this * multiplier) /multiplier;
    };

    var addAngles = function(a1, v1, a2, v2){
        if (v1 == 0){
            return {angle:a2, velocity:v2}
        }

        if (v2 == 0){
            return {angle:a1, velocity:v1}
        }

        var velocityX = (Math.cos(a1) * v1) + (Math.cos(a2) * v2);
        var velocityY = (Math.sin(a1) * v1) + (Math.sin(a2) * v2);

        var angle= Math.atan2(velocityY, velocityX).toPrecision(1);
        var velocity =  Math.sqrt((velocityX*velocityX)+(velocityY*velocityY));

        return {angle:angle, velocity:velocity};
    };

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
            this.lastUpdated = new Date().getTime();  //Internal timestamp of last update

            var data = this.attributes;
            data.auxiliaryAngles = data.auxiliaryAngles || [0];
            data.auxiliaryVelocities = data.auxiliaryVelocities ||  [0];
        },

        /*** @override*/
        set: function(key, val, options) {

            if (!this.lastUpdated){
                return Backbone.Model.prototype.set.call(this,key,val,options);
            }

            if (key == null) return this;
            var attrs;
            if (typeof key === 'object') {
                attrs = key; options = val;
            } else {
                (attrs = {})[key] = val;
            }

            options = options || {};

            var changed = {};

            var data = this.attributes;

            for (var key in attrs){

               //If this set call includes an angle change, do some additional logic
               if (key === "angle"){

                   var angle = attrs[key].toPrecision(1);

                   if (angle !== data.angle){

                       //Update the auxiliary angles and velocities by adding to them the current angle/velocity
                       if (!attrs.hasOwnProperty("auxiliaryAngles")){
                           var auxiliaryAngles = data.auxiliaryAngles;
                           var auxiliaryVelocities = data.auxiliaryVelocities;

                           var auxiliaryData = addAngles(data.angle, data.velocity, auxiliaryAngles[0], auxiliaryVelocities[0]);
                           auxiliaryAngles[0] = auxiliaryData.angle;
                           auxiliaryVelocities[0] = auxiliaryData.velocity;
                       }

                       //Reset the current velocity to 0
                       if (!attrs.hasOwnProperty("velocity")){
                           data.velocity = 0;
                       }

                       data.angle = changed.angle = angle;
                   }
               }
               else if (data[key] !== attrs[key]){
                   //Ignore position changes if easing boolean is passed through options
                   if (!options.easing || (key !== "posX" && key !== "posY")){
                       data[key] = changed[key] = attrs[key];
                   }

               }
            }

            if (options.easing){
                this.ease(attrs.posX, attrs.posY);
            }

            this.changed = changed;

            return this;
        },

        update : function(deltaTime){

           var currentTime = new Date().getTime();
           var data = this.attributes;

           //Calculate deltas based on how much time has passed since last update
           var deltaSeconds = (deltaTime || (currentTime - this.lastUpdated))/1000;
           var distance = 0;

           var deltaAcc = this.ACCELERATION*deltaSeconds;
           var deltaDec = this.DECELERATION*deltaSeconds;

           var angle = data.angle;
           var velocity = data.velocity;

           //Update current velocity and increment position
           if (velocity > 0){
               velocity =  data.isAccelerating ? Math.min(velocity+deltaAcc,this.MAX_VELOCITY) : Math.max(velocity-deltaDec, 0);
               distance = velocity * deltaSeconds;


               data.posX += (Math.cos(data.angle) * distance);
               data.posY += (Math.sin(data.angle) * distance);
               data.velocity = velocity;
           }

          //Update auxiliary velocities and increment position
          var i = data.auxiliaryAngles.length-1;
          do{
              angle = data.auxiliaryAngles[i];
              velocity = data.auxiliaryVelocities[i];

              if (velocity > 0){
                  //Auxiliary velocities are always decelerating
                  velocity = Math.max(data.auxiliaryVelocities[i]-deltaDec, 0);
                  distance = velocity * deltaSeconds;

                  data.posX += (Math.cos(angle) * distance);
                  data.posY += (Math.sin(angle) * distance);
                  data.auxiliaryVelocities[i] = velocity;
              }
          }while(i--);

          //We need to check that we're still within the boundary of the zone,
          //and if not move the player to the opposite end

          var radius = this.SIZE/2;
          var maxPosX =  this.ZONE_WIDTH+radius;
          var maxPosY =  this.ZONE_HEIGHT+radius;

          if (data.posX > maxPosX){
             data.posX -= maxPosX;
          }else if (data.posX < -radius){
             data.posX += maxPosX;
          }

          if (data.posY > maxPosY){
             data.posY -= maxPosY;
          }else if (data.posY < -radius){
             data.posY += maxPosY;
          }

          //Update last updated timestamp
          this.lastUpdated = currentTime;

          return this;
        },

        /**
         * Ease a player to a new position, by adding an auxiliary angle and velocity to update by.
         * This function can serve as a "dead reckoning algorithm" to smooth difference between positions on the client and server
         * @param {number} posX
         * @param {number} posY
         * @returns {*}
         */
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
                var data = this.attributes;
                data.auxiliaryAngles[1] = Math.atan2(deltaY, deltaX).toPrecision(1);
                data.auxiliaryVelocities[1] = Math.sqrt(2*this.DECELERATION*distance);
            }

            return this;
        }
    });


    return Player;
});