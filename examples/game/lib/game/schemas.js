define(function(){
   return {

       Ping : {
          timestamps : ["long"]
       },

       GameData : {
           latency : "uint16",
           zone : {type:"object", schema:"Zone"},
           playerId : "uint8"
       },

       Zone : {
           players : [{type:"object", schema:"Player"}]
       },

       Player : {
           id : "uint8",
           posX : "uint16",
           posY : "uint16",
           angle : {type:"float", byteLength:1, precision:1},
           velocity : {type:"float", unsigned:true, byteLength:2, precision:3},
           isAccelerating : "boolean"
       },

       PlayerUpdate : {
           angle :  {type:"float", byteLength:1, precision:1},
           isAccelerating : "boolean"
       }

   }
});