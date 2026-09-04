const socket = io({
    transports: ["websocket"]
});

// ===============================
// Current User
// ===============================

let currentUser =
    localStorage.getItem("chatUser") || "";


// ===============================
// Start Chat
// ===============================

function startChat() {

    const usernameInput =
        document.getElementById("username");

    const username =
        usernameInput.value.trim();

    if (username === "") {

        alert("Please enter your name.");

        return;
    }

    currentUser = username;

    localStorage.setItem(
        "chatUser",
        currentUser
    );

    document.getElementById(
        "name-screen"
    ).style.display = "none";

    document.getElementById(
        "chat-container"
    ).style.display = "flex";

    socket.emit(
        "setUser",
        currentUser
    );

    loadMessages();
}


// ===============================
// Online Status
// ===============================

function updateOnlineStatus(users) {

    const status =
        document.getElementById(
            "online-status"
        );

    if (!currentUser) {

        status.textContent =
            "Please enter your name";

        return;
    }

    const otherUsers =
        users.filter(
            user => user !== currentUser
        );

    if (otherUsers.length > 0) {

        status.textContent =
            `${otherUsers.join(", ")} is online`;

    }
    else {

        status.textContent =
            "No other user online";

    }

}


// ===============================
// Create Message
// ===============================

function createMessageElement(item) {

    const message =
        document.createElement("div");

    message.dataset.messageId =
        item._id;

    // Sent / Received
    message.className =
        item.sender === currentUser
            ? "message sent"
            : "message received";


    // ===============================
    // Message Text
    // ===============================

    const messageText =
        document.createElement("div");

    messageText.className =
        "message-text";

    messageText.textContent =
        item.sender +
        ": " +
        item.message;


    // ===============================
    // Message Bottom
    // ===============================

    const messageBottom =
        document.createElement("div");

    messageBottom.className =
        "message-bottom";


    // ===============================
    // Time
    // ===============================

    const time =
        new Date(item.createdAt);

    const formattedTime =
        time.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    const messageTime =
        document.createElement("small");

    messageTime.textContent =
        formattedTime;

    messageBottom.appendChild(
        messageTime
    );


    // ===============================
    // Status
    // ===============================

    if (
        item.sender === currentUser
    ) {

        const messageStatus =
            document.createElement("span");

        messageStatus.className =
            "message-status";

        if (
            item.status === "read"
        ) {

            messageStatus.textContent =
                "✓✓";

            messageStatus.classList.add(
                "read"
            );

        }
        else if (
            item.status === "delivered"
        ) {

            messageStatus.textContent =
                "✓✓";

        }
        else {

            messageStatus.textContent =
                "✓";

        }

        messageBottom.appendChild(
            messageStatus
        );

    }


    // ===============================
    // Delete Button
    // ===============================

    const deleteButton =
        document.createElement("button");

    deleteButton.textContent =
        "🗑️";

    deleteButton.className =
        "delete-button";

    deleteButton.title =
        "Delete message";

    deleteButton.onclick =
        function () {

            deleteMessage(
                item._id,
                message
            );

        };


    // ===============================
    // Add Elements
    // ===============================

    message.appendChild(
        messageText
    );

    message.appendChild(
        messageBottom
    );

    message.appendChild(
        deleteButton
    );

    return message;
}


// ===============================
// Send Message
// ===============================

async function sendMessage() {

    const input =
        document.getElementById(
            "message"
        );

    const text =
        input.value.trim();

    if (text === "") {
        return;
    }

    if (!currentUser) {

        alert(
            "Please enter your name first."
        );

        return;
    }

    try {

        socket.emit(
            "stopTyping"
        );

        const response =
            await fetch(
                "/api/messages",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        sender:
                            currentUser,

                        message:
                            text

                    })

                }
            );

        const data =
            await response.json();

        if (data.success) {

            socket.emit(
                "sendMessage",
                data.message
            );

            input.value = "";

            clearTypingIndicator();

        }
        else {

            console.error(
                "Message was not saved:",
                data.error
            );

        }

    }
    catch (error) {

        console.error(
            "Error sending message:",
            error
        );

    }

}


// ===============================
// Delete Message
// ===============================

async function deleteMessage(
    messageId,
    messageElement
) {

    const confirmDelete =
        confirm(
            "Are you sure you want to delete this message?"
        );

    if (!confirmDelete) {
        return;
    }

    try {

        const response =
            await fetch(
                `/api/messages/${messageId}`,
                {
                    method: "DELETE"
                }
            );

        const data =
            await response.json();

        if (data.success) {

            messageElement.remove();

        }
        else {

            console.error(
                "Delete failed:",
                data.error
            );

        }

    }
    catch (error) {

        console.error(
            "Error deleting message:",
            error
        );

    }

}


// ===============================
// Mark Message Read
// ===============================

function markMessageAsRead(messageId) {

    socket.emit(
        "messageRead",
        messageId
    );

}


// ===============================
// Load Messages
// ===============================

async function loadMessages() {

    if (!currentUser) {
        return;
    }

    try {

        const response =
            await fetch(
                "/api/messages"
            );

        const messages =
            await response.json();

        const chatBox =
            document.getElementById(
                "chat-box"
            );

        chatBox.innerHTML = "";

        messages.forEach(
            (item) => {

                const messageElement =
                    createMessageElement(
                        item
                    );

                chatBox.appendChild(
                    messageElement
                );


                // Other user's message
                if (
                    item.sender !== currentUser
                ) {

                    // First mark delivered
                    if (
                        item.status ===
                        "sent"
                    ) {

                        socket.emit(
                            "messageDelivered",
                            item._id
                        );

                    }

                    // Then mark read
                    if (
                        item.status !==
                        "read"
                    ) {

                        markMessageAsRead(
                            item._id
                        );

                    }

                }

            }
        );

        chatBox.scrollTop =
            chatBox.scrollHeight;

    }
    catch (error) {

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
    function (item) {

        if (!currentUser) {
            return;
        }

        const chatBox =
            document.getElementById(
                "chat-box"
            );

        // Prevent duplicate own message
        const existingMessage =
            document.querySelector(
                `[data-message-id="${item._id}"]`
            );

        if (existingMessage) {
            return;
        }

        const messageElement =
            createMessageElement(
                item
            );

        chatBox.appendChild(
            messageElement
        );

        chatBox.scrollTop =
            chatBox.scrollHeight;


        // ===============================
        // Received Message
        // ===============================

        if (
            item.sender !== currentUser
        ) {

            // Delivered
            socket.emit(
                "messageDelivered",
                item._id
            );

            // Read
            setTimeout(
                function () {

                    markMessageAsRead(
                        item._id
                    );

                },
                300
            );

        }

    }
);


// ===============================
// Message Status Update
// ===============================

socket.on(
    "messageStatus",
    function (data) {

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

        if (
            data.status === "delivered"
        ) {

            statusElement.textContent =
                "✓✓";

            statusElement.classList.remove(
                "read"
            );

        }

        if (
            data.status === "read"
        ) {

            statusElement.textContent =
                "✓✓";

            statusElement.classList.add(
                "read"
            );

        }

    }
);


// ===============================
// Connection
// ===============================

socket.on(
    "connect",
    function () {

        console.log(
            "Connected to server:",
            socket.id
        );

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
    function (users) {

        updateOnlineStatus(
            users
        );

    }
);


// ===============================
// Typing Indicator
// ===============================

let typingTimer;

let isTyping = false;


function startTyping() {

    if (!isTyping) {

        isTyping = true;

        socket.emit(
            "typing"
        );

    }

    clearTimeout(
        typingTimer
    );

    typingTimer =
        setTimeout(
            stopTyping,
            1500
        );

}


function stopTyping() {

    if (isTyping) {

        isTyping = false;

        socket.emit(
            "stopTyping"
        );

    }

    clearTimeout(
        typingTimer
    );

    clearTypingIndicator();

}


function clearTypingIndicator() {

    const indicator =
        document.getElementById(
            "typing-indicator"
        );

    if (indicator) {

        indicator.textContent =
            "";

    }

}


socket.on(
    "userTyping",
    function (username) {

        const indicator =
            document.getElementById(
                "typing-indicator"
            );

        if (indicator) {

            indicator.textContent =
                `${username} is typing...`;

        }

    }
);


socket.on(
    "userStoppedTyping",
    function () {

        clearTypingIndicator();

    }
);


// ===============================
// Input
// ===============================

const messageInput =
    document.getElementById(
        "message"
    );

messageInput.addEventListener(
    "input",
    function () {

        if (
            messageInput.value.trim() === ""
        ) {

            stopTyping();

        }
        else {

            startTyping();

        }

    }
);


// ===============================
// Enter to Send
// ===============================

messageInput.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            sendMessage();

        }

    }
);


// ===============================
// Username Enter Key
// ===============================

const usernameInput =
    document.getElementById(
        "username"
    );

usernameInput.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Enter"
        ) {

            event.preventDefault();

            startChat();

        }

    }
);


// ===============================
// Page Load
// ===============================

if (currentUser) {

    document.getElementById(
        "name-screen"
    ).style.display = "none";

    document.getElementById(
        "chat-container"
    ).style.display = "flex";

    loadMessages();

}