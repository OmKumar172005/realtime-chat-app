const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const Message = require("./messageModel");

const app = express();

const server =
    http.createServer(app);

const io =
    new Server(server);

const PORT = process.env.PORT || 3000;

// ===============================
// Middleware
// ===============================

app.use(express.json());

app.use(
    express.static(
        path.join(__dirname, "..")
    )
);

// ===============================
// MongoDB Connection
// ===============================

mongoose.connect(
    process.env.MONGO_URI
)
.then(() => {

    console.log(
        "MongoDB connected successfully!"
    );

})
.catch((error) => {

    console.log(
        "MongoDB connection failed:",
        error.message
    );

});

// ===============================
// Save Message
// ===============================

app.post(
    "/api/messages",
    async (req, res) => {

        try {

            const newMessage =
                new Message({

                    sender:
                        req.body.sender,

                    message:
                        req.body.message

                });

            await newMessage.save();

            res.json({

                success: true,

                message:
                    newMessage

            });

        }
        catch (error) {

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ===============================
// Get Messages
// ===============================

app.get(
    "/api/messages",
    async (req, res) => {

        try {

            const messages =
                await Message.find()
                    .sort({
                        createdAt: 1
                    });

            res.json(messages);

        }
        catch (error) {

            res.status(500).json({

                error:
                    error.message

            });

        }

    }
);

// ===============================
// Delete Message
// ===============================

app.delete(
    "/api/messages/:id",
    async (req, res) => {

        try {

            const deletedMessage =
                await Message.findByIdAndDelete(
                    req.params.id
                );

            if (!deletedMessage) {

                return res.status(404).json({

                    success: false,

                    error:
                        "Message not found"

                });

            }

            res.json({

                success: true,

                message:
                    "Message deleted successfully"

            });

        }
        catch (error) {

            res.status(500).json({

                success: false,

                error:
                    error.message

            });

        }

    }
);

// ===============================
// Test API
// ===============================

app.get(
    "/api/message",
    (req, res) => {

        res.json({

            message:
                "Hello from the backend!"

        });

    }
);

// ===============================
// Online Users
// ===============================

const onlineUsers =
    new Map();

// ===============================
// Socket.IO
// ===============================

io.on(
    "connection",
    (socket) => {

        console.log(
            "A user connected:",
            socket.id
        );

        // ===============================
        // Set User
        // ===============================

        socket.on(
            "setUser",
            (username) => {

                onlineUsers.set(
                    socket.id,
                    username
                );

                console.log(
                    `${username} is online`
                );

                io.emit(
                    "onlineUsers",
                    Array.from(
                        onlineUsers.values()
                    )
                );

            }
        );

        // ===============================
        // Send Message
        // ===============================

        socket.on(
            "sendMessage",
            (data) => {

                console.log(
                    "Message received:",
                    data
                );

                io.emit(
                    "receiveMessage",
                    data
                );

            }
        );

        // ===============================
        // Message Delivered
        // ===============================

        socket.on(
            "messageDelivered",
            async (messageId) => {

                try {

                    const message =
                        await Message.findById(
                            messageId
                        );

                    if (!message) {
                        return;
                    }

                    if (
                        message.status ===
                        "sent"
                    ) {

                        message.status =
                            "delivered";

                        await message.save();

                    }

                    io.emit(
                        "messageStatus",
                        {

                            messageId:
                                messageId,

                            status:
                                message.status

                        }
                    );

                }
                catch (error) {

                    console.log(
                        "Delivery error:",
                        error.message
                    );

                }

            }
        );

        // ===============================
        // Message Read
        // ===============================

        socket.on(
            "messageRead",
            async (messageId) => {

                try {

                    const message =
                        await Message.findById(
                            messageId
                        );

                    if (!message) {
                        return;
                    }

                    if (
                        message.status !==
                        "read"
                    ) {

                        message.status =
                            "read";

                        await message.save();

                    }

                    io.emit(
                        "messageStatus",
                        {

                            messageId:
                                messageId,

                            status:
                                "read"

                        }
                    );

                }
                catch (error) {

                    console.log(
                        "Read status error:",
                        error.message
                    );

                }

            }
        );

        // ===============================
        // Typing Started
        // ===============================

        socket.on(
            "typing",
            () => {

                const username =
                    onlineUsers.get(
                        socket.id
                    );

                if (!username) {
                    return;
                }

                socket.broadcast.emit(
                    "userTyping",
                    username
                );

            }
        );

        // ===============================
        // Typing Stopped
        // ===============================

        socket.on(
            "stopTyping",
            () => {

                const username =
                    onlineUsers.get(
                        socket.id
                    );

                if (!username) {
                    return;
                }

                socket.broadcast.emit(
                    "userStoppedTyping",
                    username
                );

            }
        );

        // ===============================
        // Disconnect
        // ===============================

        socket.on(
            "disconnect",
            () => {

                const username =
                    onlineUsers.get(
                        socket.id
                    );

                onlineUsers.delete(
                    socket.id
                );

                console.log(
                    `${username || "A user"} disconnected`
                );

                io.emit(
                    "onlineUsers",
                    Array.from(
                        onlineUsers.values()
                    )
                );

                if (username) {

                    socket.broadcast.emit(
                        "userStoppedTyping",
                        username
                    );

                }

            }
        );

    }
);

// ===============================
// Start Server
// ===============================

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `Server running at http://localhost:${PORT}`
        );

    }
);

