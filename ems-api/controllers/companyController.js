const { Company, CompanyAddress } = require("../models");

exports.updateCompany = async (req, res) => {
  try {
    const { company_id } = req.params; // Get company ID from URL params
    const {
      name,
      industry,
      timezone,
      user_limit,
      address,
      city,
      state,
      postal_code,
      country,
    } = req.body;

    // Find the company
    const company = await Company.findByPk(company_id, {
      include: [{ model: CompanyAddress }],
    });

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Update company details
    await company.update({
      name: name || company.name,
      industry: industry || company.industry,
      timezone: timezone || company.timezone,
      user_limit: user_limit || company.user_limit,
    });

    // Update address if provided
    if (address || city || state || postal_code || country) {
      if (company.CompanyAddress) {
        await company.CompanyAddress.update({
          address: address || company.CompanyAddress.address,
          city: city || company.CompanyAddress.city,
          state: state || company.CompanyAddress.state,
          postal_code: postal_code || company.CompanyAddress.postal_code,
          country: country || company.CompanyAddress.country,
        });
      }
    }

    res.status(200).json({ message: "Company updated successfully", company });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.updateUserLimit = async (req, res) => {
  try {
    const { company_id } = req.params; // Get company ID from URL params
    const { user_limit } = req.body; // Get new user limit

    if (!user_limit || user_limit < 1) {
      return res.status(400).json({ message: "User limit must be at least 1" });
    }

    // Find the company
    const company = await Company.findByPk(company_id);

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    // Update user limit
    await company.update({ user_limit });

    res
      .status(200)
      .json({ message: "User limit updated successfully", company });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
