const mongoose = require('mongoose');
const playerSchema = require('./Player');

const gameSchema = new mongoose.Schema({
    words:[
        {
            type:String,
        }
    ],
    players: [playerSchema],
    isJoin:{
        type: Boolean,
        default: true,
    },
    isOver: {
        type: Boolean,
        default: false,
    },
    startTime:{
        type: Number,
    },
});

const gameModel = mongoose.model('Game',gameSchema);   //it is needed when you want to create a collection directly in the mongoDb

module.exports = gameModel;