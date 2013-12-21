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

        initialize : function(){
            this.listenTo(this.players, "change:posX", onPosXChange);
            this.listenTo(this.players, "change:posY", onPosYChange);
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
                this.players.set(attrs.players);
                delete attrs.players;
            }

            return Backbone.Model.prototype.set.call(this, attrs, options);
        },

        /*** @override*/
        toJSON : function(){
            var json =  Backbone.Model.prototype.toJSON.call(this);
            json.players = this.players.toJSON();
            return json;
        },


        update : function(timeOffset){
            for (var i=0; i < this.players.length; i++){
                this.players.at(i).update(timeOffset);
            }
        }
    });

    function onPosXChange(model, value){

        var radius = model.SIZE/2;

        if (value > this.WIDTH+radius){
            model.set("posX", value-this.WIDTH-radius);
        }else if (value < -radius){
            model.set("posX",this.WIDTH+radius+value);
        }
    }

    function onPosYChange(model,value){
        var radius = model.SIZE/2;

        if (value > this.HEIGHT+radius){
            model.set("posY", value-this.HEIGHT-radius);
        }else if (value < -radius){
            model.set("posY",this.HEIGHT+radius+value);
        }
    }

    return Zone;
});