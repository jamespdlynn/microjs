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
            velocityX : 0,
            velocityY : 0,
            isAccelerating : false
        },

        initialize : function(){
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

                var newVelocityX = data.velocityX + (Math.cos(data.angle) * this.ACCELERATION * deltaTime);
                var newVelocityY = data.velocityY + (Math.sin(data.angle) * this.ACCELERATION * deltaTime);

                var deltaS2 = 0;
                if (newVelocityX > this.MAX_VELOCITY || newVelocityX < -this.MAX_VELOCITY){
                    newVelocityX = (newVelocityX > 0) ? this.MAX_VELOCITY : -this.MAX_VELOCITY;
                    deltaS2 = getTime(data.velocityX, newVelocityX, this.ACCELERATION);
                }

                if (newVelocityY > this.MAX_VELOCITY || newVelocityY < -this.MAX_VELOCITY){
                    newVelocityY = (newVelocityY > 0) ? this.MAX_VELOCITY : -this.MAX_VELOCITY;
                    deltaS2 = Math.max(deltaS2, getTime(data.velocityY, newVelocityY, this.ACCELERATION));
                }

                if (deltaS2){
                    this.update(deltaS2*1000);

                    deltaTime -= deltaS2;
                    data.posX +=  newVelocityX * deltaTime;
                    data.posY +=  newVelocityY * deltaTime;

                }else{
                    data.posX += getDistance(data.velocityX, newVelocityX, deltaTime);
                    data.posY += getDistance(data.velocityY, newVelocityY, deltaTime);
                }

                data.velocityX = newVelocityX;
                data.velocityY = newVelocityY;

            }
            else{
                data.posX +=  data.velocityX * deltaTime;
                data.posY +=  data.velocityY * deltaTime;
            }

            if (this.easing){
                data.posX += this.easeX * deltaTime;
                data.posY += this.easeY * deltaTime;
            }

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

            var interval = Constants.UPDATE_INTERVAL/1000;
            this.easing = true;
            this.easeX = deltaX / interval;
            this.easeY = deltaY / interval;

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



    return Player;
});