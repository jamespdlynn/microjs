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
           posX : {type:"float", byteLength:4, precision:6},
           posY : {type:"float", byteLength:4, precision:6},
           angle : {type:"float", byteLength:1, precision:1},
           velocity : {type:"float", unsigned:true, byteLength:2, precision:2},
           auxiliaryAngles : {
               type:"array",
               byteLength:1,
               element:{
                   type:"float",
                   byteLength:1,
                   precision:1
               }
           },
           auxiliaryVelocities : {
               type:"array",
               byteLength:2,
               element:{
                   type:"float",
                   byteLength:2,
                   unsigned:true,
                   precision:2
               }
           },
           isAccelerating : "boolean"
       },

       PlayerUpdate : {
           id : "uint",
           angle :  {type:"float", byteLength:1, precision:1},
           isAccelerating : "boolean"
       }

   }
});