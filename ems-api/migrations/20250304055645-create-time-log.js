module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.createTable("TimeLogs", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },
      start_time: { type: Sequelize.DATE, allowNull: true },
      end_time: { type: Sequelize.DATE, allowNull: true },
      duration: { type: Sequelize.INTEGER, allowNull: true },
      time_type: {
        type: Sequelize.ENUM("manual", "automatic", "idle"),
        allowNull: false,
      }, // ✅ New field to track time type
      activity_type: {
        type: Sequelize.ENUM("working", "lunch", "break", "meeting", "acw"),
        allowNull: false,
      }, // ✅ Keeping activity tracking types
      status: {
        type: Sequelize.ENUM("active", "stopped", "idle"),
        allowNull: false,
        defaultValue: "active",
      },
      synced: { type: Sequelize.BOOLEAN, defaultValue: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.dropTable("TimeLogs");
  },
};
