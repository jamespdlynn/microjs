define(['backbone','model/player'], function(Backbone,Player){

    var PlayerCollection = Backbone.Collection.extend({
        model : Player
    });

    var Zone = Backbone.Model.extend({

        //Constants
        WIDTH : 800,
        HEIGHT : 600,

        defaults : {
            players : []
        },

        initialize : function(){
            this.players = this.attributes.players = new PlayerCollection(this.attributes.players);

            this.listenTo(this.players, "change:posX", onPosXChange);
            this.listenTo(this.players, "change:posY", onPosYChange);
        },

        createPlayer : function(id){
            var player = new Player({
                id : id,
                posX : Math.random() * this.WIDTH,
                posY : Math.random() * this.HEIGHT
            });

            this.players.add(player);

            return player;
        },

        update : function(){
            for (var i=0; i < this.players.length; i++){
                this.players.at(i).update();
            }
        },

        //override
        toJSON : function(){
            return {
                players : this.players.toJSON()
            }
        }
    });

    function onPosXChange(model, value){
        var radius = model.SIZE/2;

        if (value > this.WIDTH+radius){
            model.set("posX", -radius);
        }else if (value < -radius){
            model.set("posX",this.WIDTH+radius);
        }
    }

    function onPosYChange(model,value){
        var radius = model.SIZE/2;

        if (value > this.HEIGHT+radius){
            model.set("posY", -radius);
        }else if (value < -radius){
            model.set("posY",this.HEIGHT+radius);
        }
    }

    return Zone;
});