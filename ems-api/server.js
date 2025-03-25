const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const timeTrackingRoutes = require("./routes/timeTracking");
const userRoutes = require("./routes/users");
const companyRoutes = require("./routes/company");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/time-tracking", timeTrackingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/company", companyRoutes);

// Middleware to validate file access
const validateFileAccess = (req, res, next) => {
  // Only allow access to screenshot files
  if (!req.path.startsWith("/screenshots/")) {
    return res.status(403).send("Access denied");
  }
  next();
};

// Add static file serving with validation
app.use(
  "/uploads",
  validateFileAccess,
  express.static(path.join(__dirname, "uploads"))
);

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});

// Make Socket.IO available in other files
global.io = io;

server.listen(5000, () => console.log("Server running on port 5000"));
