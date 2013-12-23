define(['backbone','model/player'], function(Backbone,Player){

    var PlayerCollection = Backbone.Collection.extend({
        model : Player
    });

    var Zone = Backbone.Model.extend({

        //Constants
        WIDTH : 1024,
        HEIGHT : 512,

        defaults : {
            id : 0,
            players : []
        },

        /** @override*/
        constructor : function(){
            //We keep track of players within a collection rather that just an array
            this.players = new PlayerCollection();
            Backbone.Model.prototype.constructor.apply(this, arguments);
        },
        /*** @override*/
        get : function(attr){
            return (attr == "players") ?  this.players.toJSON() : this.attributes[attr];
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

            //Rather than replacing the players collection, we use its set property to update what is necessary
            if (attrs.players){
                this.players.set(attrs.players, options);
                delete attrs.players;
            }

            return Backbone.Model.prototype.set.call(this, attrs, options);
        },

        update : function(deltaTime){
            for (var i=0; i < this.players.length; i++){
                this.players.models[i].update(deltaTime);
            }

            return this;
        },

        /*** @override*/
        toJSON : function(){
            return {id:this.id, players: this.players.toJSON()};
        }
    });


    Player.prototype.ZONE_WIDTH = Zone.prototype.WIDTH;
    Player.prototype.ZONE_HEIGHT = Zone.prototype.HEIGHT;

    return Zone;
});