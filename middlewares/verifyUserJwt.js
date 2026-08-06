import jwt from "jsonwebtoken";
import { User } from "../models/index";

async function verifyUserJwt(req, res, next) {
  const token = req.cookies.info;

  if (!token) {
    return res.status(401).json({
      status: "error",
      message: "User not authorized to access this resource",
    });
  }

  try {
    //decoded will has only id
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if this userId in User
    const user = await User.findOne({ where: { id: decoded.id } });

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "User not authorized to access this resource",
      });
    }

    req.user = {
      id: user.id,
      displayName: user.displayName,
      pictureUrl: user.pictureUrl,
    };

    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

export default verifyUserJwt;
