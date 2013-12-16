define(['backbone','model/zone','model/player'], function(Backbone, Zone, Player){

    var GameData = Backbone.Model.extend({

        defaults : {
            isRunning : false,
            latency : 0,
            playerId : 0,
            currentZone : {}
        },

        /** @override*/
        constructor : function(attributes, options){
            this.currentZone = new Zone(); //Track "currentZone" through a backbone model instead of an object
            Backbone.Model.prototype.constructor.call(this, attributes, options);
        },

        initialize : function(){
            this.player = this.currentZone.players.get(this.attributes.playerId);
            this.on("change:playerId", onPlayerIdChange);
        },

        //Override "currentZone" getters and setters
        get : function(attr){
            return (attr == "currentZone") ?  this.currentZone.toJSON() : this.attributes[attr];
        },

        set: function(key, val, options) {
            if (key == null) return this;
            var attrs;
            if (typeof key === 'object') {
                attrs = key; options = val;
            } else {
                (attrs = {})[key] = val;
            }

            if (attrs.currentZone && this.currentZone){
                this.currentZone.set(attrs.currentZone);
                delete attrs.currentZone;
            }

            return Backbone.Model.prototype.set.call(this, attrs, options);
        },

        toJSON : function(){
            var json =  Backbone.Model.prototype.toJSON.call(this);
            json.currentZone = this.currentZone.toJSON();

            return json;
        }
    });

    function onPlayerIdChange(model, value){
        model.player = model.currentZone.players.get(value);
    }

    return GameData;
});