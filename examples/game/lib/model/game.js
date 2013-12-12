define(['backbone'], function(Backbone){

    var GameData = Backbone.Model.extend({

        defaults : {
            latency : 0,
            player : null,
            currentZone : null,
            initialized : false
        },

        //override
        toJSON : function(){
            var data = this.attributes;
            return {
                latency : data.latency,
                playerId : data.player ? data.player.id : null,
                currentZone :  data.currentZone ?  data.currentZone.toJSON() : null,
                initialized : data.initialized
            }
        }
    });


    return GameData;
});