import { User } from "../models/index";
import jwt from "jsonwebtoken";

async function isAuth(req, res) {
  try {
    const token = req.cookies.info;
    if (!token) {
      return res.status(401).json({
        status: "error",
        message: "Unauthorized access",
      });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      attributes: ["id", "displayName", "pictureUrl"],
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

export { isAuth };
