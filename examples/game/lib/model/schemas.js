define(function(){
   return {

       Ping : {
          timestamps : ["long"],
          latency : "uint16"
       },

       GameData : {
           currentZone : {type:"object", schema:"Zone"},
           playerId : "uint8",
           isRunning : "boolean"
       },

       Zone : {
           id : "uint8",
           players : [{type:"object", schema:"Player"}]
       },

       Player : {
           id : "uint8",
           posX : {type:"float", byteLength:2, precision:1},
           posY : {type:"float", byteLength:2, precision:1},
           angle : {type:"float", byteLength:1, precision:1},
           velocityX : {type:"float", byteLength:2, precision:2},
           velocityY : {type:"float", byteLength:2, precision:2},
           isAccelerating : "boolean"
       },

       PlayerUpdate : {
           id : "uint",
           angle :  {type:"float", byteLength:1, precision:1},
           isAccelerating : "boolean"
       }

   }
});