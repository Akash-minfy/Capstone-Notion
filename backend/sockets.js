const { Server } = require("socket.io");

module.exports = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-doc", (docId) => {
      socket.join(docId);
      socket.docId = docId;
      // Optionally, set userId if sent from client
      // socket.userId = ...
      socket.to(docId).emit("user-joined", socket.id);
    });

    socket.on("leave-doc", (docId) => {
      socket.leave(docId);
      socket.to(docId).emit("user-left", socket.id);
      // Notify others to remove cursor
      socket.to(docId).emit("remote-cursor-remove", { userId: socket.userId || socket.id, docId });
    });

    socket.on("send-changes", ({ docId, delta, senderId }) => {
      socket.to(docId).emit("receive-changes", { docId, delta, senderId });
    });

    // Live cursor tracking
    socket.on("cursor-update", (data) => {
      // data: { docId, userId, name, color, from, to }
      socket.userId = data.userId; // Save for disconnect cleanup
      socket.to(data.docId).emit("remote-cursor-update", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      if (socket.docId && socket.userId) {
        socket.to(socket.docId).emit("remote-cursor-remove", { userId: socket.userId, docId: socket.docId });
      }
    });
  });
};

 
