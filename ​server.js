const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.status(200).send("Mobile Remote Controller Socket.io Server is running.");
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join-room", (roomCode) => {
    const code = String(roomCode || "").trim();
    if (!/^\d{4}$/.test(code)) {
      socket.emit("room-error", "अमान्य रूम कोड! कृपया 4 अंकों का कोड दें।");
      return;
    }

    socket.join(code);
    socket.data.room = code;
    socket.emit("joined-success", `रूम ${code} से सफलतापूर्वक जुड़ गए!`);
    socket.to(code).emit("peer-joined", { id: socket.id, room: code });
  });

  socket.on("leave-room", (roomCode) => {
    const code = String(roomCode || socket.data.room || "").trim();
    if (code) {
      socket.leave(code);
      socket.to(code).emit("peer-left", { id: socket.id, room: code });
    }
    socket.data.room = null;
  });

  socket.on("mouse-move", (data) => {
    const room = String(data?.room || socket.data.room || "").trim();
    if (!room) return;
    socket.to(room).emit("mouse-move", {
      x: Number(data.x) || 0,
      y: Number(data.y) || 0
    });
  });

  socket.on("scroll", (data) => {
    const room = String(data?.room || socket.data.room || "").trim();
    if (!room) return;
    socket.to(room).emit("scroll", {
      scrollY: Number(data.scrollY) || 0
    });
  });

  socket.on("mouse-click", (data) => {
    const room = String(data?.room || socket.data.room || "").trim();
    if (!room) return;
    const button = data?.button === "right" ? "right" : "left";
    socket.to(room).emit("mouse-click", { button });
  });

  socket.on("type-input", (data) => {
    const room = String(data?.room || socket.data.room || "").trim();
    if (!room || typeof data?.text !== "string") return;
    socket.to(room).emit("type-input", { text: data.text });
  });

  socket.on("shortcut-key", (data) => {
    const room = String(data?.room || socket.data.room || "").trim();
    if (!room || !data?.key) return;
    socket.to(room).emit("shortcut-key", { key: String(data.key) });
  });

  socket.on("screen-frame", (data) => {
    const room = String(data?.room || socket.data.room || "").trim();
    const frame = typeof data === "string" ? data : data?.image;
    if (!room || !frame) return;
    socket.to(room).emit("screen-frame", frame);
  });

  socket.on("disconnect", () => {
    const room = socket.data.room;
    if (room) {
      socket.to(room).emit("peer-left", { id: socket.id, room });
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});