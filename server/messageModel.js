const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({

    sender: {
        type: String,
        required: true
    },

    message: {
        type: String,
        required: true
    },

    status: {
        type: String,
        enum: ["sent", "delivered", "read"],
        default: "sent"
    },

    createdAt: {
        type: Date,
        default: Date.now
    }

});

const Message =
    mongoose.model(
        "Message",
        messageSchema
    );

module.exports = Message;

