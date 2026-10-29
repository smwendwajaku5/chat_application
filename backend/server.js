const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { WebSocket, WebSocketServer } = require("ws");

const frontendDirectory = path.join(__dirname, "..", "frontend");
const database = new DatabaseSync(path.join(__dirname, "messages.sqlite"));
database.exec(fs.readFileSync(path.join(__dirname, "store.sql"), "utf8"));

const insertMessage = database.prepare("INSERT INTO messages (name, text) VALUES (?, ?)");
const getMessage = database.prepare(
  "SELECT name, text, sent_at FROM messages WHERE id = ?",
);
const getRecentMessages = database.prepare(
  "SELECT name, text, sent_at FROM messages ORDER BY id DESC LIMIT ?",
);

const assets = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
  "/script.js": ["script.js", "text/javascript; charset=utf-8"],
};

const server = http.createServer((request, response) => {
  if (request.method !== "GET") {
    response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Method not allowed");
    return;
  }

  const asset = assets[new URL(request.url, "http://localhost").pathname];
  if (!asset) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  fs.readFile(path.join(frontendDirectory, asset[0]), (error, content) => {
    if (error) {
      response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Could not load the page");
      return;
    }

    response.writeHead(200, { "Content-Type": asset[1] });
    response.end(content);
  });
});

const webSocketServer = new WebSocketServer({ server, path: "/ws", maxPayload: 16 * 1024 });

webSocketServer.on("connection", (connection) => {
  const history = getRecentMessages.all(100).reverse();
  for (const message of history) {
    connection.send(JSON.stringify({ type: "message", ...message }));
  }

  connection.on("message", (rawMessage) => {
    let message;
    try {
      message = JSON.parse(rawMessage.toString());
    } catch {
      return;
    }

    if (!message || typeof message !== "object") {
      return;
    }

    if (
      typeof message.name !== "string" ||
      typeof message.text !== "string" ||
      !message.name.trim() ||
      !message.text.trim() ||
      message.name.length > 32 ||
      message.text.length > 500
    ) {
      return;
    }

    const name = message.name.trim();
    const text = message.text.trim();
    const result = insertMessage.run(name, text);
    const storedMessage = getMessage.get(result.lastInsertRowid);
    const broadcast = JSON.stringify({
      type: "message",
      ...storedMessage,
    });

    for (const client of webSocketServer.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(broadcast);
      }
    }
  });
});

const port = Number(process.env.PORT) || 3000;
server.listen(port, () => {
  console.log(`smalltalk is running at http://localhost:${port}`);
});