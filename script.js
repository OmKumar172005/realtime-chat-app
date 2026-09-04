const socket = io({
    transports: ["websocket"]
});

let currentUser = "";
let typingTimer;
let isTyping = false;


// ===============================
// Generate Avatar Initial
// ===============================

function getInitial(name) {
    return name.charAt(0).toUpperCase();
}


// ===============================
// Start Chat
// ===============================

function startChat() {

    const usernameInput = document.getElementById("username");
    const username = usernameInput.value.trim();

    if (username === "") {
        alert("Please enter your name.");
        return;
    }

    currentUser = username;

    document.getElementById("name-screen").style.display = "none";
    document.getElementById("chat-container").style.display = "flex";

    socket.emit("setUser", currentUser);

    loadMessages();

    document.getElementById("message").focus();
}


// ===============================
// Online Status
// ===============================

function updateOnlineStatus(users) {

    const status = document.getElementById("online-status");

    if (!currentUser) {
        status.textContent = "Enter your name to chat";
        return;
    }

    const otherUsers = users.filter(function(user) {
        return user !== currentUser;
    });

    if (otherUsers.length > 0) {

        status.innerHTML =
            `<span class="online-dot"></span>
             ${otherUsers.join(", ")}
             ${otherUsers.length === 1 ? "is" : "are"} online`;

        status.classList.add("online");

    } else {

        status.innerHTML =
            `<span class="offline-dot"></span>
             No other user online`;

        status.classList.remove("online");
    }
}


// ===============================
// Create Message Element
// ===============================

function createMessageElement(item) {

    const message = document.createElement("div");

    message.dataset.messageId = item._id;

    const isOwnMessage = item.sender === currentUser;

    message.className = isOwnMessage
        ? "message sent"
        : "message received";


    // ===============================
    // Avatar
    // ===============================

    const avatar = document.createElement("div");

    avatar.className = "message-avatar";

    avatar.textContent = getInitial(item.sender);


    // ===============================
    // Message Content
    // ===============================

    const content = document.createElement("div");

    content.className = "message-content";


    // ===============================
    // Sender Name
    // ===============================

    const senderName = document.createElement("div");

    senderName.className = "sender-name";

    senderName.textContent = isOwnMessage
        ? "You"
        : item.sender;


    // ===============================
    // Message Text
    // ===============================

    const messageText = document.createElement("div");

    messageText.className = "message-text";

    messageText.textContent = item.message;


    // ===============================
    // Message Bottom
    // ===============================

    const messageBottom = document.createElement("div");

    messageBottom.className = "message-bottom";


    // ===============================
    // Time
    // ===============================

    const time = new Date(item.createdAt);

    const formattedTime = time.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
    });

    const messageTime = document.createElement("span");

    messageTime.className = "message-time";

    messageTime.textContent = formattedTime;

    messageBottom.appendChild(messageTime);


    // ===============================
    // Delivery / Read Status
    // ===============================

    if (isOwnMessage) {

        const messageStatus = document.createElement("span");

        messageStatus.className = "message-status";

        if (item.status === "read") {

            messageStatus.textContent = "✓✓";

            messageStatus.classList.add("read");

        } else if (item.status === "delivered") {

            messageStatus.textContent = "✓✓";

        } else {

            messageStatus.textContent = "✓";
        }

        messageBottom.appendChild(messageStatus);
    }


    // ===============================
    // Delete Button
    // Only Own Messages
    // ===============================

    if (isOwnMessage) {

        const deleteButton = document.createElement("button");

        deleteButton.textContent = "🗑";

        deleteButton.className = "delete-button";

        deleteButton.title = "Delete message";

        deleteButton.onclick = function() {

            deleteMessage(
                item._id,
                message
            );

        };

        message.appendChild(deleteButton);
    }


    // ===============================
    // Assemble Message
    // ===============================

    content.appendChild(senderName);

    content.appendChild(messageText);

    content.appendChild(messageBottom);

    message.appendChild(avatar);

    message.appendChild(content);

    return message;
}


// ===============================
// Send Message
// ===============================

async function sendMessage() {

    const input = document.getElementById("message");

    const text = input.value.trim();

    if (text === "") {
        return;
    }

    if (!currentUser) {

        alert("Please enter your name first.");

        return;
    }

    try {

        stopTyping();

        const response = await fetch("/api/messages", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                sender: currentUser,
                message: text
            })
        });

        const data = await response.json();

        if (data.success) {

            socket.emit(
                "sendMessage",
                data.message
            );

            input.value = "";

            input.focus();

        } else {

            console.error(
                "Message was not saved:",
                data.error
            );
        }

    } catch (error) {

        console.error(
            "Error sending message:",
            error
        );
    }
}


// ===============================
// Delete Message
// ===============================

async function deleteMessage(messageId, messageElement) {

    const confirmDelete = confirm(
        "Delete this message?"
    );

    if (!confirmDelete) {
        return;
    }

    try {

        const response = await fetch(
            `/api/messages/${messageId}`,
            {
                method: "DELETE"
            }
        );

        const data = await response.json();

        if (data.success) {

            messageElement.classList.add(
                "message-removing"
            );

            setTimeout(function() {

                messageElement.remove();

            }, 200);

        } else {

            console.error(
                "Delete failed:",
                data.error
            );
        }

    } catch (error) {

        console.error(
            "Error deleting message:",
            error
        );
    }
}


// ===============================
// Mark Message As Read
// ===============================

function markMessageAsRead(messageId) {

    socket.emit(
        "messageRead",
        messageId
    );
}


// ===============================
// Load Previous Messages
// ===============================

async function loadMessages() {

    if (!currentUser) {
        return;
    }

    try {

        const response =
            await fetch("/api/messages");

        const messages =
            await response.json();

        const chatBox =
            document.getElementById("chat-box");

        chatBox.innerHTML = "";

        messages.forEach(function(item) {

            const messageElement =
                createMessageElement(item);

            chatBox.appendChild(
                messageElement
            );

            // Handle messages from other users
            if (item.sender !== currentUser) {

                // Mark as delivered
                if (item.status === "sent") {

                    socket.emit(
                        "messageDelivered",
                        item._id
                    );
                }

                // Mark as read
                if (item.status !== "read") {

                    markMessageAsRead(
                        item._id
                    );
                }
            }

        });

        chatBox.scrollTop =
            chatBox.scrollHeight;

    } catch (error) {

        console.error(
            "Error loading messages:",
            error
        );
    }
}


// ===============================
// Receive Real-Time Message
// ===============================

socket.on(
    "receiveMessage",
    function(item) {

        if (!currentUser) {
            return;
        }

        const chatBox =
            document.getElementById("chat-box");

        const existingMessage =
            document.querySelector(
                `[data-message-id="${item._id}"]`
            );

        // Prevent duplicate messages
        if (existingMessage) {
            return;
        }

        const messageElement =
            createMessageElement(item);

        chatBox.appendChild(
            messageElement
        );

        chatBox.scrollTop =
            chatBox.scrollHeight;


        // If message is from another user
        if (item.sender !== currentUser) {

            // Mark delivered
            socket.emit(
                "messageDelivered",
                item._id
            );

            // Mark read shortly after
            setTimeout(function() {

                markMessageAsRead(
                    item._id
                );

            }, 300);
        }
    }
);


// ===============================
// Message Status Update
// ===============================

socket.on(
    "messageStatus",
    function(data) {

        const messageElement =
            document.querySelector(
                `[data-message-id="${data.messageId}"]`
            );

        if (!messageElement) {
            return;
        }

        const statusElement =
            messageElement.querySelector(
                ".message-status"
            );

        if (!statusElement) {
            return;
        }


        // Delivered
        if (data.status === "delivered") {

            statusElement.textContent = "✓✓";

            statusElement.classList.remove(
                "read"
            );
        }


        // Read
        if (data.status === "read") {

            statusElement.textContent = "✓✓";

            statusElement.classList.add(
                "read"
            );
        }
    }
);


// ===============================
// Socket Connection
// ===============================

socket.on(
    "connect",
    function() {

        console.log(
            "Connected to server:",
            socket.id
        );

        // Restore username after reconnect
        if (currentUser) {

            socket.emit(
                "setUser",
                currentUser
            );
        }
    }
);


// ===============================
// Online Users
// ===============================

socket.on(
    "onlineUsers",
    function(users) {

        updateOnlineStatus(users);

    }
);


// ===============================
// Typing System
// ===============================

function startTyping() {

    if (!currentUser) {
        return;
    }

    if (!isTyping) {

        isTyping = true;

        socket.emit("typing");
    }

    clearTimeout(typingTimer);

    typingTimer = setTimeout(
        stopTyping,
        1500
    );
}


function stopTyping() {

    if (isTyping) {

        isTyping = false;

        socket.emit("stopTyping");
    }

    clearTimeout(typingTimer);

    clearTypingIndicator();
}


// ===============================
// Typing Indicator
// ===============================

socket.on(
    "userTyping",
    function(username) {

        const indicator =
            document.getElementById(
                "typing-indicator"
            );

        if (!indicator) {
            return;
        }

        indicator.innerHTML = `
            <span>${username} is typing</span>

            <span class="typing-dots">
                <i></i>
                <i></i>
                <i></i>
            </span>
        `;

        indicator.classList.add(
            "typing-active"
        );
    }
);


socket.on(
    "userStoppedTyping",
    function() {

        clearTypingIndicator();

    }
);


function clearTypingIndicator() {

    const indicator =
        document.getElementById(
            "typing-indicator"
        );

    if (indicator) {

        indicator.innerHTML = "";

        indicator.classList.remove(
            "typing-active"
        );
    }
}


// ===============================
// Message Input
// ===============================

const messageInput =
    document.getElementById("message");

messageInput.addEventListener(
    "input",
    function() {

        if (
            messageInput.value.trim() === ""
        ) {

            stopTyping();

        } else {

            startTyping();
        }
    }
);


// ===============================
// Enter To Send Message
// ===============================

messageInput.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {

            event.preventDefault();

            sendMessage();
        }
    }
);


// ===============================
// Username Input
// ===============================

const usernameInput =
    document.getElementById("username");

usernameInput.addEventListener(
    "keydown",
    function(event) {

        if (event.key === "Enter") {

            event.preventDefault();

            startChat();
        }
    }
);


// ===============================
// Always Ask Username On Page Load
// ===============================

window.addEventListener(
    "load",
    function() {

        currentUser = "";

        document.getElementById(
            "name-screen"
        ).style.display = "flex";

        document.getElementById(
            "chat-container"
        ).style.display = "none";

        document.getElementById(
            "username"
        ).value = "";

        document.getElementById(
            "username"
        ).focus();
    }
);