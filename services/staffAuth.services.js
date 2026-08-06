import { UserStaff } from "../models/index";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import bcrypt from "bcrypt";

async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        status: "error",
        message: "Username and password are required",
      });
    }
    //username can be email or username
    const user = await UserStaff.findOne({
      where: {
        [Op.or]: [{ username: username }, { email: username }],
      },
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "User not authorized to access this resource",
      });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res
      .cookie("admin", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 3600000, // 1 hour
        domain: process.env.COOKIE_DOMAIN,
      })
      .status(200)
      .json({
        message: "Authorization successful",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function register(req, res) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "username, email, and password are required",
      });
    }
    // Check if user already exists
    const existingUser = await UserStaff.findOne({
      where: { [Op.or]: [{ username }, { email }] },
    });

    if (existingUser) {
      return res.status(409).json({
        status: "error",
        message: "Username or email already exists",
      });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await UserStaff.create({
      username,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    return res
      .cookie("admin", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 3600000, // 1 hour
        domain: process.env.COOKIE_DOMAIN,
      })
      .status(201)
      .json({
        message: "Registration successful",
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
        },
      });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}

async function isAuth(req, res) {
  try {
    const token = req.cookies.admin;
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized access",
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserStaff.findByPk(decoded.id, {
      attributes: ["id", "username", "email"],
    });
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }
    return res.status(200).json({
      status: "success",
      user,
    });
  } catch (error) {
    console.error("Error in isAuth:", error);
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

//delete user by id
async function deleteUser(req, res) {
  try {
    const { id } = req.params;

    //must have at least one admin
    const adminCount = await UserStaff.count();
    if (adminCount <= 1) {
      return res.status(400).json({
        status: "error",
        message: "At least one admin must exist",
      });
    }

    const user = await UserStaff.findByPk(id);
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }
    await user.destroy();
    return res.status(200).json({
      status: "success",
      message: "User deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

//get all staff users
async function getAllUsers(req, res) {
  try {
    const users = await UserStaff.findAll({
      attributes: ["id", "username", "email", "createdAt", "updatedAt"],
    });
    return res.status(200).json({
      status: "success",
      users,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

//logout
async function logout(req, res) {
  try {
    res.clearCookie("admin", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      domain: process.env.COOKIE_DOMAIN,
    });
    return res.status(200).json({
      status: "success",
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
}

export { login, register, isAuth, deleteUser, getAllUsers, logout };
