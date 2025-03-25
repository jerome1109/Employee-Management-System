module.exports = (sequelize, DataTypes) => {
  const Screenshot = sequelize.define("Screenshot", {
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  });

  Screenshot.associate = (models) => {
    Screenshot.belongsTo(models.User, {
      foreignKey: "user_id",
      onDelete: "CASCADE",
    });
    Screenshot.belongsTo(models.Company, {
      foreignKey: "company_id",
      onDelete: "CASCADE",
    });
  };

  return Screenshot;
};
