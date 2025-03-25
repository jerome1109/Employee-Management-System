module.exports = (sequelize, DataTypes) => {
  const CompanyAddress = sequelize.define("CompanyAddress", {
    company_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Companies",
        key: "id",
      },
      onDelete: "CASCADE",
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    postal_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    country: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  });

  CompanyAddress.associate = (models) => {
    CompanyAddress.belongsTo(models.Company, {
      foreignKey: "company_id",
      onDelete: "CASCADE",
    });
  };

  return CompanyAddress;
};
