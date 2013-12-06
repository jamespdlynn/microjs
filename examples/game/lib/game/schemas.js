define(function(){
   return {

       Ping : {
          timestamps : ["long"]
       },

       Zone : {
           players : [{type:"object", schema:"Player"}]
       },

       Player : {
           id : "uint8",
           posX : "uint16",
           posY : "uint16",
           angle : "float8",
           velocity : {type:"float", unsigned:true, byteLength:2, precision:3},
           isAccelerating : "boolean"
       },

       PlayerInfo : {
           playerId : "uint8",
           latency : "uint16"
       },

       PlayerUpdate : {
           angle : "float8",
           isAccelerating : "boolean"
       }

   }
});