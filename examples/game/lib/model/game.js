define(['backbone','model/zone'], function(Backbone, Zone){

    var GameData = Backbone.Model.extend({

        defaults : {
            playerId : 0, //The player id of the user
            currentZone : {}, //The data for the zone the user is in
            isRunning : false //If this game is currently running
        },

        /** @override*/
        get : function(attr){
            if (attr == "player"){
                return this.player ? this.player.toJSON() : null;
            }

            if (attr == "currentZone"){
                return this.currentZone ? this.currentZone.toJSON() : null;
            }

            return this.attributes[attr];
        },

        /** @override*/
        set: function(key, val, options) {
            if (key == null) return this;
            var attrs;
            if (typeof key === 'object') {
                attrs = key; options = val;
            } else {
                (attrs = {})[key] = val;
            }

            //We use Backbone Model to track the zone, rather than just a JSON Object
            if (attrs.currentZone){
                this.currentZone = new Zone(attrs.currentZone);
                delete attrs.currentZone;
            }

            //Keep track of the model that represents the user player, by looking up the PlayerId in the zones player collections
            if (attrs.playerId && this.currentZone){
                this.player = this.currentZone.players.get(attrs.playerId);
            }

            return Backbone.Model.prototype.set.call(this, attrs, options);
        }
    });


    return GameData;
});