module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM("admin", "manager", "employee"), // ✅ Defined roles
      allowNull: false,
      defaultValue: "employee",
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  });

  User.associate = (models) => {
    User.belongsTo(models.Company, {
      foreignKey: "company_id",
      onDelete: "CASCADE",
    });
    User.hasMany(models.Screenshot, {
      foreignKey: "user_id",
      as: "Screenshots",
    });
    User.hasMany(models.TimeLog, {
      foreignKey: "user_id",
      as: "TimeLogs",
    });
  };

  return User;
};
