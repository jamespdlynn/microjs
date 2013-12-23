//Main require function
require(['model/game','view','client'], function(GameData, GameView, Client){
    //Create global game data object
    window.gameData = new GameData();

    GameView.initialize();
    Client.run();
});