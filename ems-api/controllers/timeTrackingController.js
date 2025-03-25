const { TimeLog } = require("../models");
const { Op } = require("sequelize");

global.io = global.io || { emit: () => {} }; // Ensure global.io exists

exports.startManualTracking = async (req, res) => {
  try {
    const { activity_type } = req.body;
    const userId = req.user.id;

    if (
      !["working", "lunch", "break", "meeting", "acw"].includes(activity_type)
    ) {
      return res.status(400).json({ message: "Invalid activity type" });
    }

    const newLog = await TimeLog.create({
      user_id: userId,
      start_time: new Date(),
      time_type: "manual",
      activity_type,
      status: "active",
    });

    global.io.emit("timeTrackingUpdate", newLog);
    res
      .status(201)
      .json({ message: "Manual tracking started", timeLog: newLog });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.stopManualTracking = async (req, res) => {
  try {
    const { activity_type } = req.body;
    const userId = req.user.id;

    const activeLog = await TimeLog.findOne({
      where: { user_id: userId, status: "active", time_type: "manual" },
    });

    if (!activeLog)
      return res.status(400).json({ message: "No active tracking found." });

    const endTime = new Date();
    const duration = Math.round(
      (endTime - new Date(activeLog.start_time)) / 1000
    );

    await activeLog.update({
      end_time: endTime,
      duration,
      status: "stopped",
      activity_type: activity_type || activeLog.activity_type,
    });

    global.io.emit("timeTrackingUpdate", activeLog);
    res
      .status(200)
      .json({ message: "Manual tracking stopped", timeLog: activeLog });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.getManualTimeLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const timeLogs = await TimeLog.findAll({
      where: { user_id: userId, time_type: "manual" },
      order: [["start_time", "DESC"]],
    });
    res.status(200).json({ timeLogs });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.logAutomaticTracking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.body;
    const newLog = await TimeLog.create({
      user_id: userId,
      start_time: new Date(),
      time_type: "automatic",
      activity_type: "working",
      status,
    });
    global.io.emit("timeTrackingUpdate", newLog);
    res
      .status(201)
      .json({ message: "Automatic tracking logged", timeLog: newLog });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.getActiveTimeLog = async (req, res) => {
  try {
    const activeTimeLog = await TimeLog.findOne({
      where: {
        user_id: req.user.id,
        end_time: null, // Find unfinished time log
        status: "active",
      },
      order: [["start_time", "DESC"]], // Get the most recent one
    });

    res.json({
      success: true,
      data: activeTimeLog,
    });
  } catch (error) {
    console.error("Error fetching active time log:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch active time log",
      error: error.message,
    });
  }
};

exports.startIdleTracking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { idle_duration } = req.body;
    const newLog = await TimeLog.create({
      user_id: userId,
      start_time: new Date(),
      duration: idle_duration,
      time_type: "idle",
      activity_type: "working",
      status: "active",
    });
    global.io.emit("timeTrackingUpdate", newLog);
    res.status(201).json({ message: "Idle time logged", timeLog: newLog });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.stopIdleTracking = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find the active idle tracking session
    const activeIdleLog = await TimeLog.findOne({
      where: {
        user_id: userId,
        status: "active",
        time_type: "idle",
        end_time: null,
      },
      order: [["start_time", "DESC"]],
    });

    if (!activeIdleLog) {
      return res.status(404).json({ message: "No active idle tracking found" });
    }

    const endTime = new Date();
    const actualDuration = Math.round(
      (endTime - new Date(activeIdleLog.start_time)) / 1000
    );

    // Update the idle log with end time and actual duration
    await activeIdleLog.update({
      end_time: endTime,
      duration: actualDuration, // Override with actual duration
      status: "stopped",
    });

    global.io.emit("timeTrackingUpdate", activeIdleLog);
    res.status(200).json({
      message: "Idle tracking stopped",
      timeLog: activeIdleLog,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.getAllTimeLogs = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      activity_type,
      status,
      time_type,
      sort_by = "start_time",
      sort_order = "DESC",
    } = req.query;

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = { user_id: userId };

    // Add date filters if provided
    if (startDate && endDate) {
      whereClause.start_time = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else if (startDate) {
      whereClause.start_time = {
        [Op.gte]: new Date(startDate),
      };
    } else if (endDate) {
      whereClause.start_time = {
        [Op.lte]: new Date(endDate),
      };
    }

    // Add activity type filter if provided
    if (activity_type) {
      whereClause.activity_type = activity_type;
    }

    // Add status filter if provided
    if (status) {
      whereClause.status = status;
    }

    // Add time type filter if provided
    if (time_type) {
      whereClause.time_type = time_type;
    }

    // Get total count for pagination
    const totalCount = await TimeLog.count({ where: whereClause });

    // Get paginated results
    const timeLogs = await TimeLog.findAll({
      where: whereClause,
      order: [[sort_by, sort_order]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.status(200).json({
      timeLogs,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching time logs:", error);
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};
