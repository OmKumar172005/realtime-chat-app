// =========================================
// SOCKET CONNECTION
// =========================================

const socket = io({
    transports: ["websocket"]
});


let currentUser = "";

let typingTimer;

let isTyping = false;

let isNearBottom = true;


// =========================================
// INITIALIZE
// =========================================

window.addEventListener("load", function () {

    currentUser = "";

    document.getElementById("name-screen").style.display = "flex";

    document.getElementById("chat-container").style.display = "none";

    document.getElementById("username").value = "";

    document.getElementById("username").focus();

    loadDarkMode();

});


// =========================================
// AVATAR / INITIAL
// =========================================

function getInitial(name) {

    return name.charAt(0).toUpperCase();

}


// =========================================
// START CHAT
// =========================================

function startChat() {

    const usernameInput =
        document.getElementById("username");

    const username =
        usernameInput.value.trim();


    if (username === "") {

        alert("Please enter your name.");

        return;
    }


    if (username.length < 1) {

        alert("Invalid username.");

        return;
    }


    currentUser = username;


    document.getElementById("name-screen").style.display = "none";

    document.getElementById("chat-container").style.display = "flex";


    socket.emit(
        "setUser",
        currentUser
    );


    loadMessages();


    document.getElementById("message").focus();


    requestNotificationPermission();

}


// =========================================
// ONLINE STATUS
// =========================================

function updateOnlineStatus(users) {

    const status =
        document.getElementById("online-status");


    if (!currentUser) {

        status.textContent =
            "Enter your name to chat";

        return;
    }


    const otherUsers =
        users.filter(function (user) {

            return user !== currentUser;

        });


    if (otherUsers.length > 0) {

        status.innerHTML =
            `<span class="online-dot"></span>
             ${otherUsers.join(", ")}
             ${otherUsers.length === 1 ? "is" : "are"} online`;

    } else {

        status.innerHTML =
            `<span class="offline-dot"></span>
             No other user online`;
    }
}


// =========================================
// CREATE MESSAGE
// =========================================

function createMessageElement(item) {

    const message =
        document.createElement("div");


    message.dataset.messageId =
        item._id;


    const isOwnMessage =
        item.sender === currentUser;


    message.className =
        isOwnMessage
            ? "message sent"
            : "message received";


    // =====================================
    // CONTENT
    // =====================================

    const content =
        document.createElement("div");


    content.className =
        "message-content";


    // =====================================
    // USERNAME
    // =====================================

    const senderName =
        document.createElement("div");


    senderName.className =
        "sender-name";


    senderName.textContent =
        item.sender;


    // =====================================
    // MESSAGE
    // =====================================

    const messageText =
        document.createElement("div");


    messageText.className =
        "message-text";


    messageText.textContent =
        item.message;


    // =====================================
    // BOTTOM DETAILS
    // =====================================

    const messageBottom =
        document.createElement("div");


    messageBottom.className =
        "message-bottom";


    // =====================================
    // TIME
    // =====================================

    const time =
        new Date(item.createdAt);


    const formattedTime =
        time.toLocaleTimeString([], {

            hour: "2-digit",

            minute: "2-digit"

        });


    const messageTime =
        document.createElement("span");


    messageTime.className =
        "message-time";


    messageTime.textContent =
        formattedTime;


    messageBottom.appendChild(
        messageTime
    );


    // =====================================
    // DELIVERY / READ
    // =====================================

    if (isOwnMessage) {

        const messageStatus =
            document.createElement("span");


        messageStatus.className =
            "message-status";


        if (item.status === "read") {

            messageStatus.textContent =
                "✓✓";

            messageStatus.classList.add(
                "read"
            );

        } else if (
            item.status === "delivered"
        ) {

            messageStatus.textContent =
                "✓✓";

        } else {

            messageStatus.textContent =
                "✓";
        }


        messageBottom.appendChild(
            messageStatus
        );
    }


    // =====================================
    // DELETE
    // =====================================

    if (isOwnMessage) {

        const deleteButton =
            document.createElement("button");


        deleteButton.textContent =
            "🗑";


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


        message.appendChild(
            deleteButton
        );
    }


    // =====================================
    // ASSEMBLE
    // =====================================

    content.appendChild(
        senderName
    );


    content.appendChild(
        messageText
    );


    content.appendChild(
        messageBottom
    );


    message.appendChild(
        content
    );


    return message;
}


// =========================================
// SEND MESSAGE
// =========================================

async function sendMessage() {

    const input =
        document.getElementById("message");


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


    if (text.length > 1000) {

        alert(
            "Message is too long."
        );

        return;
    }


    try {

        stopTyping();


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


// =========================================
// DELETE MESSAGE
// =========================================

async function deleteMessage(
    messageId,
    messageElement
) {

    const confirmDelete =
        confirm(
            "Delete this message?"
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

            messageElement.classList.add(
                "message-removing"
            );


            setTimeout(
                function () {

                    messageElement.remove();

                },
                200
            );


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


// =========================================
// LOAD MESSAGES
// =========================================

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
            function (item) {

                const messageElement =
                    createMessageElement(item);


                chatBox.appendChild(
                    messageElement
                );


                if (
                    item.sender !== currentUser
                ) {

                    if (
                        item.status === "sent"
                    ) {

                        socket.emit(
                            "messageDelivered",
                            item._id
                        );
                    }


                    if (
                        item.status !== "read"
                    ) {

                        markMessageAsRead(
                            item._id
                        );
                    }
                }

            }
        );


        scrollToBottom();


    } catch (error) {

        console.error(
            "Error loading messages:",
            error
        );
    }
}


// =========================================
// RECEIVE REAL-TIME MESSAGE
// =========================================

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


        const existingMessage =
            document.querySelector(
                `[data-message-id="${item._id}"]`
            );


        if (existingMessage) {

            return;
        }


        const messageElement =
            createMessageElement(item);


        chatBox.appendChild(
            messageElement
        );


        const fromOtherUser =
            item.sender !== currentUser;


        if (fromOtherUser) {

            socket.emit(
                "messageDelivered",
                item._id
            );


            setTimeout(
                function () {

                    markMessageAsRead(
                        item._id
                    );

                },
                300
            );


            // Notification

            showNewMessageNotification(
                item
            );

            if (document.visibilityState !== "visible") {

    unreadCount++;

    updatePageTitle();
}


            // If user is not at bottom

            if (!isNearBottom) {

                showNewMessageButton();

            } else {

                scrollToBottom();

            }

        } else {

            scrollToBottom();
        }

    }
);


// =========================================
// MESSAGE STATUS
// =========================================

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


// =========================================
// SOCKET CONNECT
// =========================================

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


// =========================================
// ONLINE USERS
// =========================================

socket.on(
    "onlineUsers",
    function (users) {

        updateOnlineStatus(users);

    }
);


// =========================================
// TYPING
// =========================================

function startTyping() {

    if (!currentUser) {

        return;
    }


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


// =========================================
// USER TYPING
// =========================================

socket.on(
    "userTyping",
    function (username) {

        const indicator =
            document.getElementById(
                "typing-indicator"
            );


        if (!indicator) {

            return;
        }


        indicator.innerHTML = `
            <span>
                ${username} is typing
            </span>

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


// =========================================
// USER STOPPED TYPING
// =========================================

socket.on(
    "userStoppedTyping",
    function () {

        clearTypingIndicator();

    }
);


// =========================================
// CLEAR TYPING
// =========================================

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


// =========================================
// INPUT EVENTS
// =========================================

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

        } else {

            startTyping();
        }

    }
);


// =========================================
// ENTER TO SEND
// =========================================

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


// =========================================
// USERNAME ENTER
// =========================================

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


// =========================================
// CHAT SCROLL DETECTION
// =========================================

const chatBox =
    document.getElementById(
        "chat-box"
    );


chatBox.addEventListener(
    "scroll",
    function () {

        const distanceFromBottom =
            chatBox.scrollHeight -
            chatBox.scrollTop -
            chatBox.clientHeight;


        isNearBottom =
            distanceFromBottom < 100;


        if (isNearBottom) {

            hideNewMessageButton();
        }

    }
);


// =========================================
// SCROLL TO BOTTOM
// =========================================

function scrollToBottom() {

    const chatBox =
        document.getElementById(
            "chat-box"
        );


    chatBox.scrollTo({

        top:
            chatBox.scrollHeight,

        behavior:
            "smooth"

    });


    isNearBottom = true;


    hideNewMessageButton();
}


// =========================================
// NEW MESSAGE BUTTON
// =========================================

function showNewMessageButton() {

    const button =
        document.getElementById(
            "new-message-button"
        );


    button.classList.add(
        "show"
    );
}


function hideNewMessageButton() {

    const button =
        document.getElementById(
            "new-message-button"
        );


    button.classList.remove(
        "show"
    );
}


// =========================================
// BROWSER NOTIFICATION
// =========================================

function requestNotificationPermission() {

    if (
        "Notification" in window &&
        Notification.permission === "default"
    ) {

        Notification.requestPermission();
    }
}


function showNewMessageNotification(item) {

    // Do not show notification
    // if browser tab is active

    if (
        document.visibilityState === "visible"
    ) {

        return;
    }


    if (
        !("Notification" in window)
    ) {

        return;
    }


    if (
        Notification.permission !== "granted"
    ) {

        return;
    }


    const notification =
        new Notification(
            `New message from ${item.sender}`,
            {
                body: item.message,

                icon: ""
            }
        );


    notification.onclick =
        function () {

            window.focus();

        };
}


// =========================================
// TAB TITLE NOTIFICATION
// =========================================

let unreadCount = 0;


document.addEventListener(
    "visibilitychange",
    function () {

        if (
            document.visibilityState === "visible"
        ) {

            unreadCount = 0;

            updatePageTitle();

        }

    }
);


function updatePageTitle() {

    if (unreadCount > 0) {

        document.title =
            `(${unreadCount}) My Chat App`;

    } else {

        document.title =
            "My Chat App";
    }
}


// =========================================
// DARK MODE
// =========================================

function toggleDarkMode() {

    document.body.classList.toggle(
        "dark-mode"
    );


    const isDark =
        document.body.classList.contains(
            "dark-mode"
        );


    localStorage.setItem(
        "darkMode",
        isDark
            ? "enabled"
            : "disabled"
    );


    updateThemeButton(
        isDark
    );
}


function loadDarkMode() {

    const darkMode =
        localStorage.getItem(
            "darkMode"
        );


    if (
        darkMode === "enabled"
    ) {

        document.body.classList.add(
            "dark-mode"
        );


        updateThemeButton(
            true
        );

    } else {

        updateThemeButton(
            false
        );
    }
}


function updateThemeButton(
    isDark
) {

    const button =
        document.getElementById(
            "theme-toggle"
        );


    if (!button) {

        return;
    }


    button.textContent =
        isDark
            ? "☀️"
            : "🌙";
}