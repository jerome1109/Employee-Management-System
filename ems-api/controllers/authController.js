const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Company, CompanyAddress } = require("../models");

exports.registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      company_id,
      company_name,
      industry,
      timezone,
      address,
      city,
      state,
      postal_code,
      country,
    } = req.body;

    let company;

    if (company_id) {
      company = await Company.findByPk(company_id, {
        include: [{ model: CompanyAddress }, { model: User }],
      });
      if (!company)
        return res.status(400).json({ message: "Invalid company ID" });

      // Check if the company has reached its user limit
      if (company.Users.length >= company.user_limit) {
        return res
          .status(403)
          .json({ message: "User limit reached for this company" });
      }
    } else {
      if (
        !company_name ||
        !industry ||
        !timezone ||
        !address ||
        !city ||
        !state ||
        !postal_code ||
        !country
      ) {
        return res
          .status(400)
          .json({ message: "Company details and full address are required" });
      }

      company = await Company.create({
        name: company_name,
        industry,
        timezone,
        user_limit: 1, // Default user limit
      });

      await CompanyAddress.create({
        company_id: company.id,
        address,
        city,
        state,
        postal_code,
        country,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      company_id: company.id,
    });

    const token = jwt.sign(
      { id: user.id, company_id: company.id, role: user.role },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    res
      .status(201)
      .json({ message: "User registered successfully", token, company });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({
      where: { email },
      include: [
        {
          model: Company,
          include: [{ model: CompanyAddress }], // Include company and address details
        },
      ],
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, company_id: user.company_id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    console.log("Login successful");
    // Return user details and token
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: {
          id: user.Company.id,
          name: user.Company.name,
          industry: user.Company.industry,
          timezone: user.Company.timezone,
          address: user.Company.CompanyAddress,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
