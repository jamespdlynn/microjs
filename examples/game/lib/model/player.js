define(['backbone','model/constants'],function(Backbone,Constants){

    var Player = Backbone.Model.extend({

        defaults : {
            posX : 0,
            posY : 0,
            angle :0,
            velocityX : 0,
            velocityY : 0,
            isAccelerating : false
        },

        initialize : function(){
            this.intialized = true;
            this.lastUpdated = new Date().getTime();  //Internal timestamp of last update
        },

        /*** @override */
        set: function(key, val, options) {

            if (!this.intialized){
                return Backbone.Model.prototype.set.call(this,key,val,options);
            }

            //Allow for either key/value or object to be sent as setter
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


            this.update();

            //Loop through the new object and set new attributes on the player
            for (var key in attrs){

                if (key === "angle"){
                    attrs[key] = attrs[key].toPrecision(1);
                }

                if (data[key] !== attrs[key]){
                    //Ignore position changes if easing boolean is passed through options
                    if (!options.easing || (key !== "posX" && key !== "posY")){
                        data[key] = changed[key] = attrs[key];
                    }
                }
            }

            //If easing option passed in, ease this player towards new position values
            if (options.easing){
                this.ease(attrs.posX, attrs.posY);
            }

            this.changed = changed;

            return this;
        },

        /**
         * Updates this player's velocity and position values
         * @param {number} [deltaTime] Time interval in milliseconds (by default uses the amount of time since function last called)
         * @returns {*}
         */
        update : function(deltaTime){

            var currentTime = new Date().getTime();
            deltaTime = deltaTime || currentTime-this.lastUpdated;

            //Ignore minor updates
            if (deltaTime < 5){
                return this;
            }

            deltaTime /= 1000; //convert to seconds

            //Calculate deltas based on how much time has passed since last update
            var data = this.attributes;

            if (data.isAccelerating){

                var deltaVelocity = this.ACCELERATION * deltaTime;
                var deltaTime1 = 0;

                //Calculate new velocities
                var newVelocityX = data.velocityX + (Math.cos(data.angle) * deltaVelocity);
                var newVelocityY = data.velocityY + (Math.sin(data.angle) * deltaVelocity);

                //If velocities exceed maximums, we have to do some additional logic to calculate new positions
                if (newVelocityX > this.MAX_VELOCITY_X || newVelocityX < -this.MAX_VELOCITY_X){
                    newVelocityX = (newVelocityX > 0) ? this.MAX_VELOCITY_X : -this.MAX_VELOCITY_X;

                    deltaTime1 = getTime(data.velocityX, newVelocityX, this.ACCELERATION);
                    data.posX += getDistance(data.velocityX, newVelocityX, deltaTime1) + (newVelocityX*(deltaTime-deltaTime1));
                }
                else{
                    data.posX += getDistance(data.velocityX, newVelocityX, deltaTime);
                }

                if (newVelocityY > this.MAX_VELOCITY_Y || newVelocityY < -this.MAX_VELOCITY_Y){
                    newVelocityY = (newVelocityY > 0) ? this.MAX_VELOCITY_Y : -this.MAX_VELOCITY_Y;

                    deltaTime1 = getTime(data.velocityY, newVelocityY, this.ACCELERATION);
                    data.posY += getDistance(data.velocityY, newVelocityY, deltaTime1) + (newVelocityY*(deltaTime-deltaTime1));
                }else{
                    data.posY += getDistance(data.velocityY, newVelocityY, deltaTime);
                }

                data.velocityX = newVelocityX;
                data.velocityY = newVelocityY;
            }
            else{
                data.posX +=  data.velocityX * deltaTime;
                data.posY +=  data.velocityY * deltaTime;
            }

            //Check to see if player has exceeded zone boundary, in which case send them to opposite side
            var radius = this.SIZE/2;
            var maxPosX =  Constants.Zone.WIDTH+radius;
            var maxPosY =  Constants.Zone.HEIGHT+radius;

            while (data.posX > maxPosX) data.posX -= maxPosX+radius;
            while (data.posX < -radius) data.posX += maxPosX+radius;

            while (data.posY > maxPosY) data.posY -= maxPosY+radius;
            while (data.posY < -radius) data.posY += maxPosY+radius;

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

            //Calculate the position deltas while account for zone boundaries
            var zoneWidth = Constants.Zone.WIDTH;
            var zoneHeight = Constants.Zone.HEIGHT;

            var deltaX = posX - this.get("posX");
            if (Math.abs(deltaX) > zoneWidth/2){
                (posX < zoneWidth/2) ? deltaX += zoneWidth : deltaX -= zoneWidth;
            }

            var deltaY = posY - this.get("posY");
            if (Math.abs(deltaY) > zoneHeight/2){
                (posY < zoneHeight/2) ? deltaY += zoneHeight : deltaY -= zoneHeight;
            }

            var data = this.attributes;

            //Update the velocities to move to the correct position by the next update
            var interval = Constants.UPDATE_INTERVAL/1000;
            data.velocityX += deltaX / interval;
            data.velocityY += deltaY / interval;

            //If these changes take us over the maximum velocities, update the constants to allow for it
            this.MAX_VELOCITY_X = Math.max(data.velocityX, Constants.Player.MAX_VELOCITY_X);
            this.MAX_VELOCITY_Y = Math.max(data.velocityY, Constants.Player.MAX_VELOCITY_Y);

            return this;
        }
    }).extend(Constants.Player);


    //Private helper functions

    function getDistance(vi, vf, t){
        return ((vi+vf)/2)*t;
    }

    function getTime(vi, vf, a){
        return Math.abs((vf-vi)/a);
    }

    /**
     * Helper function for rounding to decimal precision
     * @param precision
     * @returns {number}
     */
    Number.prototype.toPrecision = function(precision){
        var multiplier = Math.pow(10, precision);
        return  Math.round(this * multiplier) /multiplier;
    };

    //We can cheat and save performance by caching values into our sine and cosine functions
    //as we are only using a limited number of angles to calculate with
    var sin = Math.sin, cos = Math.cos;
    var sines = {};
    for (var i=-Math.PI; i < Math.PI; i+=0.1){
        i = i.toPrecision(1);
        sines[i] = sin(i);
    }
    Math.sin = function(val){
        return sines[val] || sin(val);
    };

    var cosines = {};
    for (var j=-Math.PI; j <= Math.PI; j+=0.1){
        j = j.toPrecision(1);
        cosines[j] = cos(j);
    }
    Math.cos = function(val){
        return cosines[val] || cos(val);
    };


    return Player;
});