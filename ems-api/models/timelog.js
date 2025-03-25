module.exports = (sequelize, DataTypes) => {
  const TimeLog = sequelize.define("TimeLog", {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    end_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    time_type: {
      type: DataTypes.ENUM("manual", "automatic", "idle"),
      allowNull: false,
    }, // ✅ New field to track time type
    activity_type: {
      type: DataTypes.ENUM("working", "lunch", "break", "meeting", "acw"),
      allowNull: false,
    }, // ✅ Keeping activity tracking types
    status: {
      type: DataTypes.ENUM("active", "stopped"),
      allowNull: false,
      defaultValue: "active",
    },
    synced: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  });

  TimeLog.associate = (models) => {
    TimeLog.belongsTo(models.User, {
      foreignKey: "user_id",
      onDelete: "CASCADE",
    });
  };

  return TimeLog;
};
