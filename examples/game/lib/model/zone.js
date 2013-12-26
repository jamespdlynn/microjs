define(['backbone','model/player','model/constants'], function(Backbone,Player,Constants){

    var PlayerCollection = Backbone.Collection.extend({
        model : Player
    });

    var Zone = Backbone.Model.extend({

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
            var i = this.players.length;
            while(i--){
                this.players.models[i].update(deltaTime);
            }
            return this;
        },

        /*** @override*/
        toJSON : function(){
            return {id:this.id, players: this.players.toJSON()};
        }
    }).extend(Constants.Zone);

    return Zone;
});