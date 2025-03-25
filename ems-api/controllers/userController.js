const { User, Company, Screenshot, TimeLog } = require("../models");
const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs").promises;
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.getUsers = async (req, res) => {
  try {
    const { company_id } = req.user; // Get company_id from logged-in user

    const users = await User.findAll({
      where: { company_id }, // ✅ Fetch users belonging to the same company
      attributes: ["id", "name", "email", "role", "createdAt"], // ✅ Select specific fields
      include: [{ model: Company, attributes: ["name"] }], // ✅ Include company info
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Update a user (only admin & manager can update)
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;

    // Find user
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user fields
    await user.update({
      name: name || user.name,
      email: email || user.email,
      role: role || user.role,
    });

    res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Delete a user (only admin can delete)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete user
    await user.destroy();

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ✅ Reset user password (admin can reset any user's password, users can reset their own)
exports.resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    const requestingUserId = req.user.id;
    const requestingUserRole = req.user.role;

    // Validate input
    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    // Find user
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check authorization: only admin can reset others' passwords, users can reset their own
    if (requestingUserId !== user.id && requestingUserRole !== "admin") {
      return res
        .status(403)
        .json({ message: "Not authorized to reset this user's password" });
    }

    // If user is resetting their own password, verify current password
    if (requestingUserId === user.id) {
      if (!currentPassword) {
        return res
          .status(400)
          .json({ message: "Current password is required" });
      }

      try {
        // Verify current password using bcrypt directly
        const isPasswordValid = await bcrypt.compare(
          currentPassword,
          user.password
        );
        if (!isPasswordValid) {
          return res
            .status(401)
            .json({ message: "Current password is incorrect" });
        }
      } catch (bcryptError) {
        console.error("Password comparison error:", bcryptError);
        return res.status(500).json({
          message: "Error verifying password",
          error: bcryptError.message,
        });
      }
    }

    try {
      // Hash the new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password with hashed version
      await user.update({
        password: hashedPassword,
      });

      res.status(200).json({ message: "Password reset successfully" });
    } catch (hashError) {
      console.error("Password hashing error:", hashError);
      return res.status(500).json({
        message: "Error hashing password",
        error: hashError.message,
      });
    }
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Add this new function for handling screenshot uploads
exports.uploadScreenshot = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { id: user_id, company_id } = req.user; // Get current user's ID and company_id
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const uploadDir = path.join(__dirname, "../uploads/screenshots");

    // Ensure uploads directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    // Move file to permanent location
    await fs.rename(req.file.path, path.join(uploadDir, fileName));

    // Create screenshot record in database
    const screenshot = await Screenshot.create({
      filename: fileName,
      path: `/uploads/screenshots/${fileName}`,
      user_id,
      company_id,
    });

    res.status(200).json({
      message: "Screenshot uploaded successfully",
      screenshot,
    });
  } catch (error) {
    // Clean up uploaded file if it exists
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Add method to get user's screenshots
exports.getUserScreenshots = async (req, res) => {
  try {
    const { company_id } = req.user;
    const { user_id } = req.params;
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    console.log("Query params:", {
      company_id,
      user_id,
      startDate,
      endDate,
      page,
      limit,
    });

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build where clause with company_id and user_id if provided
    const whereClause = {
      company_id,
      ...(user_id && { user_id: parseInt(user_id) }),
    };

    // Add date filtering if dates are provided
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate + "T00:00:00.000Z");
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate + "T23:59:59.999Z");
      }
    }

    // Get total count for pagination
    const totalCount = await Screenshot.count({ where: whereClause });

    // Get paginated screenshots
    const screenshots = await Screenshot.findAll({
      where: whereClause,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: User,
          attributes: ["id", "name", "email"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Format response with metadata
    const response = {
      success: true,
      total: totalCount,
      data: screenshots.map((screenshot) => ({
        id: screenshot.id,
        filename: screenshot.filename,
        imageUrl: screenshot.path,
        uploadedBy: {
          id: screenshot.User.id,
          name: screenshot.User.name,
          email: screenshot.User.email,
        },
        uploadedAt: screenshot.createdAt,
        company_id: screenshot.company_id,
      })),
      metadata: {
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalCount,
          itemsPerPage: parseInt(limit),
          hasNextPage,
          hasPrevPage,
        },
        dateRange: {
          from: startDate || "all",
          to: endDate || "all",
        },
        filters: {
          user_id: user_id || "all",
          company_id,
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in getUserScreenshots:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Get specific user details
exports.getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const user = await User.findOne({
      where: {
        id,
        company_id,
      },
      attributes: ["id", "name", "email", "role", "createdAt"],
      include: [
        {
          model: Company,
          attributes: ["name", "id"],
        },
        {
          model: Screenshot,
          as: "Screenshots",
          attributes: ["id", "filename", "path", "createdAt"],
          where: {
            createdAt: {
              [Op.between]: [startOfDay, endOfDay],
            },
          },
          order: [["createdAt", "DESC"]],
          required: false, // Makes it a LEFT JOIN so we still get user data even if no screenshots
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or not authorized to view this user",
      });
    }

    // Format response
    const response = {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: {
          id: user.Company.id,
          name: user.Company.name,
        },
        joinedAt: user.createdAt,
        todayScreenshots: {
          total: user.Screenshots.length,
          date: startOfDay.toISOString().split("T")[0],
          items: user.Screenshots.map((screenshot) => ({
            id: screenshot.id,
            filename: screenshot.filename,
            imageUrl: screenshot.path,
            uploadedAt: screenshot.createdAt,
          })),
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// Get user's time tracker logs
exports.getUserTimeLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const { company_id } = req.user;
    const { startDate, endDate } = req.query;

    // Get date range
    const start = startDate
      ? new Date(startDate + "T00:00:00.000Z")
      : new Date();
    const end = endDate ? new Date(endDate + "T23:59:59.999Z") : new Date();

    // Set to start of day if no startDate provided
    if (!startDate) {
      start.setHours(0, 0, 0, 0);
    }

    // Set to end of day if no endDate provided
    if (!endDate) {
      end.setHours(23, 59, 59, 999);
    }

    const user = await User.findOne({
      where: {
        id,
        company_id,
      },
      attributes: ["id", "name", "email", "role"],
      include: [
        {
          model: TimeLog,
          as: "TimeLogs",
          where: {
            createdAt: {
              [Op.between]: [start, end],
            },
          },
          attributes: [
            "id",
            "start_time",
            "end_time",
            "duration",
            "status",
            "createdAt",
            "time_type",
            "activity_type",
          ],
          order: [["createdAt", "DESC"]],
          required: false,
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or not authorized to view this user",
      });
    }

    // Calculate total duration
    const totalDuration = user.TimeLogs.reduce(
      (sum, log) => sum + (log.duration || 0),
      0
    );

    // Format response
    const response = {
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        timeLogs: {
          total: user.TimeLogs.length,
          totalDuration, // in seconds
          dateRange: {
            from: start.toISOString().split("T")[0],
            to: end.toISOString().split("T")[0],
          },
          items: user.TimeLogs.map((log) => ({
            id: log.id,
            startTime: log.start_time,
            endTime: log.end_time,
            duration: log.duration,
            status: log.status,
            timeType: log.time_type,
            activityType: log.activity_type,
            createdAt: log.createdAt,
          })),
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in getUserTimeLogs:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Get specific user details
exports.getCurrentUserDetails = async (req, res) => {
  try {
    const { company_id, id: user_id } = req.user;
    const { startDate, endDate } = req.query;

    // Get today's date range by default
    const today = new Date();
    const start = startDate
      ? new Date(startDate + "T00:00:00.000Z")
      : new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          0,
          0,
          0
        );

    const end = endDate
      ? new Date(endDate + "T23:59:59.999Z")
      : new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate(),
          23,
          59,
          59
        );

    const user = await User.findOne({
      where: {
        id: user_id,
        company_id,
      },
      attributes: ["id", "name", "email", "role", "createdAt"],
      include: [
        {
          model: Company,
          attributes: ["name", "id"],
        },
        {
          model: Screenshot,
          as: "Screenshots",
          attributes: ["id", "filename", "path", "createdAt"],
          where: {
            createdAt: {
              [Op.between]: [start, end],
            },
          },
          order: [["createdAt", "DESC"]],
          required: false,
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or not authorized to view this user",
      });
    }

    // Format response
    const response = {
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: {
          id: user.Company.id,
          name: user.Company.name,
        },
        joinedAt: user.createdAt,
        Screenshots: {
          total: user.Screenshots.length,
          dateRange: {
            from: start.toISOString().split("T")[0],
            to: end.toISOString().split("T")[0],
          },
          items: user.Screenshots.map((screenshot) => ({
            id: screenshot.id,
            filename: screenshot.filename,
            imageUrl: screenshot.path,
            uploadedAt: screenshot.createdAt,
          })),
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in getCurrentUserDetails:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

exports.getCurrentUserTimeLogs = async (req, res) => {
  try {
    const { company_id, id: user_id } = req.user;
    const { startDate, endDate } = req.query;

    console.log("Current user data:", { company_id, user_id }); // Debug log

    // Get date range
    const start = startDate
      ? new Date(startDate + "T00:00:00.000Z")
      : new Date();
    const end = endDate ? new Date(endDate + "T23:59:59.999Z") : new Date();

    // Set to start of day if no startDate provided
    if (!startDate) {
      start.setHours(0, 0, 0, 0);
    }

    // Set to end of day if no endDate provided
    if (!endDate) {
      end.setHours(23, 59, 59, 999);
    }

    console.log("Date range:", { start, end }); // Debug log

    // First, verify the user exists
    const userExists = await User.findByPk(user_id);
    console.log("User exists check:", !!userExists); // Debug log

    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Then get user with time logs
    const user = await User.findOne({
      where: {
        id: user_id,
        company_id,
      },
      attributes: ["id", "name", "email", "role"],
      include: [
        {
          model: TimeLog,
          as: "TimeLogs",
          where: {
            user_id,
            createdAt: {
              [Op.between]: [start, end],
            },
          },
          attributes: [
            "id",
            "start_time",
            "end_time",
            "duration",
            "status",
            "createdAt",
            "time_type",
            "activity_type",
          ],
          order: [["createdAt", "DESC"]],
          required: false,
        },
      ],
    });

    console.log("Found user:", !!user); // Debug log
    console.log("Time logs count:", user?.TimeLogs?.length); // Debug log

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or not authorized to view this user",
      });
    }

    // Calculate durations by activity type
    const durationsByType = user.TimeLogs.reduce(
      (acc, log) => {
        const duration = log.duration || 0;

        if (["lunch", "break"].includes(log.activity_type)) {
          acc.breakTime += duration;
        } else if (["working", "meeting", "acw"].includes(log.activity_type)) {
          acc.workingTime += duration;
        }

        acc.totalTime += duration;
        return acc;
      },
      {
        breakTime: 0,
        workingTime: 0,
        totalTime: 0,
      }
    );

    // Format response
    const response = {
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        timeLogs: {
          total: user.TimeLogs.length,
          duration: {
            total: durationsByType.totalTime,
            working: durationsByType.workingTime,
            breaks: durationsByType.breakTime,
          },
          dateRange: {
            from: start.toISOString().split("T")[0],
            to: end.toISOString().split("T")[0],
          },
          items: user.TimeLogs.map((log) => ({
            id: log.id,
            startTime: log.start_time,
            endTime: log.end_time,
            duration: log.duration,
            status: log.status,
            timeType: log.time_type,
            activityType: log.activity_type,
            createdAt: log.createdAt,
            isBreak: ["lunch", "break"].includes(log.activity_type),
          })),
        },
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in getCurrentUserTimeLogs:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};
