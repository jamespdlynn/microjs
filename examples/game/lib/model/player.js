define(['backbone','model/constants'],function(Backbone,Constants){

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


    var Player = Backbone.Model.extend({

        defaults : {
            posX : 0,
            posY : 0,
            angle :0,
            velocity : 0,
            isAccelerating : false
        },

        initialize : function(){

            //Set the auxiliary array defaults in the initializer not the prototype (otherwise we would be sharing references)
            this.attributes.auxiliaryAngles = this.attributes.auxiliaryAngles || [0];
            this.attributes.auxiliaryVelocities = this.attributes.auxiliaryVelocities ||  [0];

            //Helper variables
            this.radius = this.SIZE/2;
            this.maxPosX =  Constants.Zone.WIDTH+this.radius;
            this.maxPosY =  Constants.Zone.HEIGHT+this.radius;

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

            //Loop through the new object and set new attributes on the player

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
            if (deltaTime < 3){
                return this;
            }

            deltaTime /= 1000; //convert to seconds

            //Calculate deltas based on how much time has passed since last update
            var data = this.attributes;

            var acceleration = this.ACCELERATION;
            var deceleration = this.DECELERATION;

            var newVelocity, distance;

            //Calculate new velocities and distance travelled depending on whether player is accelerating or decelerating
            if (data.isAccelerating){
                newVelocity = getVelocity(data.velocity, acceleration, deltaTime);

                if (newVelocity > this.MAX_VELOCITY){

                    newVelocity = this.MAX_VELOCITY;
                    //calculate the amount of time getting to max velocity, and amount staying at max velocity
                    var deltaT1 = getTime(data.velocity, newVelocity, acceleration);
                    var deltaT2 = deltaTime-deltaT1;

                    distance = getDistance(data.velocity, newVelocity, deltaT1)+(deltaT2*newVelocity);
                }
                else{
                    distance = getDistance(data.velocity, newVelocity, deltaTime);
                }

            }
            else{
                newVelocity = getVelocity(data.velocity, deceleration, deltaTime);
                distance = getDistance(data.velocity, newVelocity, deltaTime);
            }

            //Update the position arguments based on our current angle
            if (distance > 0){
                data.posX += (Math.cos(data.angle) * distance);
                data.posY += (Math.sin(data.angle) * distance);
            }

            data.velocity = newVelocity;

            //Update auxiliary velocities and increment position
            var i = data.auxiliaryAngles.length-1;
            do{
                var angle = data.auxiliaryAngles[i];
                var velocity = data.auxiliaryVelocities[i];

                if (velocity > 0){
                    //Auxiliary velocities are always decelerating
                    newVelocity = getVelocity(velocity, deceleration, deltaTime);
                    distance = getDistance(velocity, newVelocity, deltaTime);

                    if (distance > 0){
                        data.posX += (Math.cos(angle) * distance);
                        data.posY += (Math.sin(angle) * distance);
                    }

                    data.auxiliaryVelocities[i] = newVelocity;
                }
            }while(i--);

            //We need to check that we're still within the boundary of the zone,
            //and move the player to the opposite end if not
            while (data.posX > this.maxPosX) data.posX -= this.maxPosX;
            while (data.posX < this.radius) data.posX += this.maxPosX;

            while (data.posY > this.maxPosY) data.posY -= this.maxPosY;
            while (data.posY < this.radius) data.posY += this.maxPosY;

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

            if (distance > this.radius){

                var data = this.attributes;
                data.auxiliaryAngles[1] = Math.atan2(deltaY, deltaX).toPrecision(1);
                data.auxiliaryVelocities[1] = Math.sqrt(-2*this.DECELERATION*distance);

                return this;
            }
        }
    }).extend(Constants.Player);


    //Private helper functions

    function getVelocity(vi,a,t){
        return Math.max(vi + (a*t),0);
    }

    function getDistance(vi, vf, t){
        return ((vi+vf)/2)*t;
    }

    function getTime(vi, vf, a){
        return (vf-vi)/a;
    }

    function addAngles (a1, v1, a2, v2){
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
    }


    return Player;
});