//Imports
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');

const Game = require('./model/Game');
const getSentence = require('./api/getSentence');
const { Console, count } = require('console');

//create a server
const app = express();
const port = process.env.PORT || 3000;
var server = http.createServer(app);
var io = require('socket.io')(server);

//middleware 
app.use(express.json());

//connect to mongoDb
// const DB = "mongodb+srv://mouryaajay7463:ajay1234@cluster0.kajdrxc.mongodb.net/?retryWrites=true&w=majority"
const DB = "mongodb+srv://mouryaajay7463:ajay1234@cluster0.kajdrxc.mongodb.net/typeracerDb"

//listening to socket io events from the client(flutter code)
io.on('connection',(socket)=>{
//   console.log(socket.id);

  //create-game event
  socket.on('create-game',async (data)=>{
    try {
        let game = new Game();

        const sentence = await getSentence();
        console.log(`sentence-->${sentence}`);
        game.words = sentence;
        let player = {
            socketID: socket.id,
            nickname: data.nickname,    //also write as only nickname, if both side same..
            isPartyLeader: true,
        };
        game.players.push(player)  //same as game['players'].add(player) in dart

        game = await game.save();

        const gameId = game._id.toString();
        socket.join(gameId);  //it will ristrict to acces globaly player i.e creating a room
        io.to(gameId).emit('updateGame',game);
    } catch (e) {
        console.log(e);
    }
  });

  //join game events
  socket.on('join-game',async(data)=>{
    try {
        // using RegExp to check whether the id is related to mongoDb or not
        if(!data.gameId.match(/^[0-9a-fA-F]{24}$/)){
            socket.emit('notCorrectGame',"Please enter a valid game ID");
            return;
        }   

        let game = await Game.findById(data.gameId);
        if(game.isJoin){
            const id = game._id.toString();
            let player = {
                nickname:data.nickname,
                socketID:socket.id,
            }
            socket.join(id);
            game.players.push(player);
            game = await game.save();
            io.to(data.gameId).emit("updateGame",game);
        }
        else{
            //game is not joinable
            socket.emit('notCorrectGame',"The game is in progress, please try again later!");
        }
    } catch (e) {
        console.log(e);
    }
  });

  //userInput listener
  socket.on('userInput',async(data)=>{
    let game = await Game.findById(data.gameID);
    if(!game.isJoin && !game.isOver){
        let player = game.players.find(
            (playerr) => playerr.socketID === socket.id 
        );

        if(game.words[player.currentWordIndex] === data.userInput.trim()){
            player.currentWordIndex = player.currentWordIndex + 1;
            if(player.currentWordIndex !== game.words.length){  
                //not guessed correctly /incomplete till
                game = await game.save();
                io.to(data.gameID).emit('updateGame',game);
            }
            else{
                //guessed correctly all and completed all
                //then calculate word per minute
                let endTime = new Date().getTime();
                let {startTime} = game;
                player.WPM = calculateWPM(endTime,startTime,player);

                game = await game.save();
                socket.emit('done');
                io.to(data.gameID).emit('updateGame',game);
            }
        }
    }
  });

  //timer listener
  socket.on("timer",async(data)=>{   
    let game = await Game.findById(data.gameID);
    let player = game.players.id(data.playerID);
 
    let countDown = 5;
    if(player.isPartyLeader){
        let timerId = setInterval(async()=>{
            if(countDown>=0){
                io.to(data.gameID).emit("timer",{
                    countDown,
                    msg: "Game Starting",
                });
                countDown--;
            }
            else{
                //update game
                game.isJoin = false;
                game = await game.save();
                io.to(data.gameID).emit('updateGame',game);

                console.log("game is in progress!");
                startGameClock(data.gameID);
                clearInterval(timerId);
            }
        }, 1000);
    }
  });

});

//startGameClock function using new format
const startGameClock = async(gameId)=>{
    let game = await Game.findById(gameId);
    game.startTime = new Date().getTime();
    game = await game.save();

    let time = 120;

    let timerId = setInterval(
    (function  gameIntervalFunc() {
        if(time>=0){
            const timeFormat = calculateTime(time);
            io.to(gameId).emit("timer",{
                countDown:timeFormat,
                msg:"Time Remaining",
            });
            // console.log(timeFormat);
            time--;
        }
        else {
            (async()=>{
                try {
                    let endTime = new Date().getTime();
                    let game = await Game.findById(gameId);
                    let {startTime} = game;

                    game.isOver = true;
                    game.players.forEach( (player,index)=>{
                        if(player.WPM === -1){
                            game.players[index].WPM = calculateWPM(endTime,startTime,player);
                        }
                    });
                    
                    game = await game.save();
                    io.to(data.gameID).emit('updateGame',game);
                    // socket.emit('done');
                    clearInterval(timerId);
                } catch (error) {
                    console.log(error);
                    clearInterval(timerId);
                }
            })();
        }
        return gameIntervalFunc;
    })(), 
    1000);
}

const calculateTime = (time)=>{
    let min = Math.floor(time/60);
    let sec = time%60;
    return `${min}:${sec < 10 ? "0"+sec : sec}`;
}

const calculateWPM = (endTime,startTime,player) =>{
    const timeTakenInsec = (endTime-startTime)/1000;
    const timeTaken = timeTakenInsec/60;
    let wordsType = player.currentWordIndex;
    const WPM = Math.floor(wordsType / timeTaken);

    return WPM;
}

mongoose.connect(DB).then(()=>{
    console.log('Connection Succesful!');
})
.catch((e)=>{
    console.log(e);
});

//listen to server
server.listen(port,"0.0.0.0",()=>{
    console.log(`Server started and running on port ${port}`);
})