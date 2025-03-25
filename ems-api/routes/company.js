const express = require("express");
const {
  updateCompany,
  updateUserLimit,
} = require("../controllers/companyController");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const router = express.Router();

// ✅ Only "admin" can update company details
router.put(
  "/:company_id",
  authMiddleware,
  roleMiddleware(["admin"]),
  updateCompany
);
// ✅ Only "admin" can update the user limit
router.put(
  "/:company_id/user-limit",
  authMiddleware,
  roleMiddleware(["admin"]),
  updateUserLimit
);

module.exports = router;
