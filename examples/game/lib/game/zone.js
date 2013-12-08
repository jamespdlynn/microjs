define(['backbone','game/player'], function(Backbone,Player){

    var PlayerCollection = Backbone.Collection.extend({
        model : Player
    });

    var Zone = function(){
        this.myPlayer = null;
        this.players = new PlayerCollection();
    };


    Zone.WIDTH = 800;
    Zone.HEIGHT = 600;

    Zone.prototype.createPlayer = function(id){
        var player = new Player({
            id : id,
            posX : Math.random() * Zone.WIDTH,
            posY : Math.random() * Zone.HEIGHT
        });

        this.players.add(player);

        return player;
    }


    Zone.prototype.setPlayers = function(playersArray){
        for (var i=0; i < playersArray.length; i++){
            this.players.add(playersArray[i]);
        }
    }

    Zone.prototype.update = function(){

        for (var i=0; i < this.players.length; i++){

            var player = this.players.at(i);
            player.update();

            var data = player.attributes;

            var radius = data.size/2;
            if (data.posX > Zone.WIDTH+radius){
                data.posX = -radius;
            }else if (data.posX < -radius){
                data.posX = Zone.WIDTH+radius;
            }

            if (data.posY > Zone.HEIGHT+radius){
                data.posY = -radius;
            }else if (data.posY < -radius){
                data.posY = Zone.HEIGHT + radius;
            }
        }
    }

    Zone.prototype.toJSON = function(){
        return {
            myPlayer : this.myPlayer,
            players : this.players.toJSON()
        }
    };



    var instance = null;
    Zone.getInstance = function(){
        return instance || (instance = new Zone());
    }

    return Zone;
});