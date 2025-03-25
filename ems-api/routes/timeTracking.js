// routes/timeTracking.js
const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  startManualTracking,
  stopManualTracking,
  logAutomaticTracking,
  logIdleTracking,
  getManualTimeLogs,
  getActiveTimeLog,
  stopIdleTracking,
  startIdleTracking,
  getAllTimeLogs,
} = require("../controllers/timeTrackingController");

const router = express.Router();

// Manual Time Tracking
router.post("/manual/start", authMiddleware, startManualTracking);
router.post("/manual/stop", authMiddleware, stopManualTracking);
router.get("/manual/logs", authMiddleware, getManualTimeLogs);

// Automatic Tracking (Active Window Usage)
router.post("/automatic", authMiddleware, logAutomaticTracking);

// Idle Time Tracking
router.post("/idle/start", authMiddleware, startIdleTracking);
router.post("/idle/stop", authMiddleware, stopIdleTracking);

router.get("/active", authMiddleware, getActiveTimeLog);
router.get("/logs", authMiddleware, getAllTimeLogs);
module.exports = router;
