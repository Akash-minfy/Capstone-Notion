const express = require("express");
const http = require("http");
const dotenv = require("dotenv");
const cors = require("cors");
 

dotenv.config();
const app = express();
const server = http.createServer(app);

// Apply Socket.io
require("./sockets")(server);

 
app.use(cors({
  origin: 'http://localhost:5173', 
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
