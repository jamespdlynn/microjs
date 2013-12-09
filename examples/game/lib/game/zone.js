define(['backbone','game/player'], function(Backbone,Player){

    var WIDTH = 800;
    var HEIGHT = 600;

    var PlayerCollection = Backbone.Collection.extend({
        model : Player
    });

    var Zone = Backbone.Model.extend({

        initialize : function(){
            this.players = new PlayerCollection();
            this.width = WIDTH;
            this.height = HEIGHT;
            this.myPlayer = null;

            this.listenTo(this.players, "change:posX", onPosXChange);
            this.listenTo(this.players, "change:posY", onPosYChange);
        },

        createPlayer : function(id){
            var player = new Player({
                id : id,
                posX : Math.random() * this.width,
                posY : Math.random() * this.height
            });

            this.players.add(player);

            return player;
        },

        update : function(){
            var models = this.players.models;
            for (var i=0; i < models.length; i++){
                models[i].update();
            }
        },

        toJSON : function(){
            return {
                players : this.players.toJSON(),
                myPlayer : this.myPlayer ? this.myPlayer.toJSON() : null,
                width : this.width,
                height : this.height
            }
        }
    });

    function onPosXChange(model, value){
        var radius = model.attributes.size/2;

        if (value > WIDTH+radius){
            model.set("posX", -radius);
        }else if (value < -radius){
            model.set("posX",WIDTH+radius);
        }
    }

    function onPosYChange(model,value){
        var radius = model.attributes.size/2;

        if (value > HEIGHT+radius){
            model.set("posY", -radius);
        }else if (value < -radius){
            model.set("posY",HEIGHT+radius);
        }
    }

    return new Zone();
});