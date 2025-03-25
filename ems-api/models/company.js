module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define("Company", {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    industry: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    timezone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    user_limit: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1, // Default limit (modify as needed)
    },
  });

  Company.associate = (models) => {
    Company.hasMany(models.User, {
      foreignKey: "company_id",
      onDelete: "CASCADE",
    });
    Company.hasOne(models.CompanyAddress, {
      foreignKey: "company_id",
      onDelete: "CASCADE",
    });
  };

  return Company;
};
