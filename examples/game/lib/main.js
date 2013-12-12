require(['client','view','model/game'], function(client, GameView, GameData){

   window.gameData = new GameData(); //Set global game data object
   gameData.on("change:initialized", function(){
       GameView.play();
   });

   client.run();
});