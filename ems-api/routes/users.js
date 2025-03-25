const express = require("express");
const {
  getUsers, // Ensure this function is imported
  updateUser,
  deleteUser,
  resetPassword,
  uploadScreenshot,
  getUserScreenshots,
  getUserDetails,
  getUserTimeLogs,
  getCurrentUserTimeLogs,
  getCurrentUserDetails,
} = require("../controllers/userController"); // ✅ Correct path

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const multer = require("multer");

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: "temp/",
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

// List routes
router.get("/list", authMiddleware, roleMiddleware(["admin"]), getUsers);

// Current user routes - These must come BEFORE /:id routes
router.get("/current", authMiddleware, getCurrentUserDetails);
router.get("/timelogs", authMiddleware, getCurrentUserTimeLogs);

// Time logs routes
router.get(
  "/:id/timelogs",
  authMiddleware,
  roleMiddleware(["admin"]),
  getUserTimeLogs
);

// Screenshot routes
router.post(
  "/screenshots",
  authMiddleware,
  upload.single("screenshot"),
  uploadScreenshot
);

router.get(
  "/screenshots/:user_id?",
  authMiddleware,
  roleMiddleware(["admin"]),
  getUserScreenshots
);

// User management routes
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin", "manager"]),
  updateUser
);

// ✅ Only "admin" can delete a user
router.delete("/:id", authMiddleware, roleMiddleware(["admin"]), deleteUser);

router.put("/:id/reset-password", authMiddleware, resetPassword);

// Put this generic route last
router.get("/:id", authMiddleware, roleMiddleware(["admin"]), getUserDetails);

module.exports = router;
