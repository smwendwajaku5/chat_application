const joinForm = document.querySelector("#join-form");
const nameInput = document.querySelector("#name-input");
const joinStatus = document.querySelector("#join-status");
const chatPanel = document.querySelector("#chat-panel");
const connectionStatus = document.querySelector("#connection-status");
const messages = document.querySelector("#messages");
const emptyState = document.querySelector("#empty-state");
const messageForm = document.querySelector("#message-form");
const messageInput = document.querySelector("#message-input");
const sendButton = document.querySelector("#send-button");
const chatStatus = document.querySelector("#chat-status");

let socket;
let joined = false;

joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (socket && socket.readyState < WebSocket.CLOSING) {
    return;
  }

  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }

  joinStatus.textContent = "Connecting to the chat...";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

  socket.addEventListener("open", () => {
    joined = true;
    joinStatus.textContent = "";
    joinForm.hidden = true;
    chatPanel.hidden = false;
    connectionStatus.textContent = "Online";
    messageInput.disabled = false;
    sendButton.disabled = false;
    messageInput.focus();
  });

  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "message") {
      addMessage(data);
    } else if (data.type === "error") {
      chatStatus.textContent = data.message;
    }
  });

  socket.addEventListener("close", () => {
    if (joined) {
      connectionStatus.textContent = "Disconnected";
      chatStatus.textContent = "Connection lost. Refresh the page to rejoin.";
    } else {
      joinStatus.textContent = "Could not connect. Is the server running?";
    }
    messageInput.disabled = true;
    sendButton.disabled = true;
  });

  socket.addEventListener("error", () => {
    joinStatus.textContent = "Could not connect. Is the server running?";
  });

  joinForm.dataset.name = name;
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !socket || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  socket.send(JSON.stringify({ name: joinForm.dataset.name, text }));
  messageInput.value = "";
  chatStatus.textContent = "";
  messageInput.focus();
});

function addMessage(message) {
  emptyState.hidden = true;

  const item = document.createElement("li");
  item.className = "message";

  const heading = document.createElement("div");
  heading.className = "message-heading";

  const sender = document.createElement("span");
  sender.className = "message-sender";
  sender.textContent = message.name;

  const time = document.createElement("time");
  time.dateTime = message.sent_at;
  time.textContent = new Date(message.sent_at).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const body = document.createElement("p");
  body.className = "message-text";
  body.textContent = message.text;

  heading.append(sender, time);
  item.append(heading, body);
  messages.append(item);
  messages.scrollTop = messages.scrollHeight;
}
