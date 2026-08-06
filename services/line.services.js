import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import axios from "axios";
import { randomBytes } from "crypto";
import { User } from "../models/index";
dotenv.config();

function generateState(length = 20) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(length);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

async function authorization(req, res) {
  try {
    const { code, state } = req.query;
    const idToken = req.body?.idToken;

    if (idToken) {
      const data = new URLSearchParams();
      data.append("id_token", idToken);
      data.append("client_id", process.env.CLIENT_ID);
      // data.append("client_id", process.env.LIFF_CLIENT_ID);

      const response = await axios.post(
        "https://api.line.me/oauth2/v2.1/verify",
        data.toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      let user = await User.findOne({ where: { id: response.data.sub } });

      if (!user) {
        // If user does not exist, create a new user
        user = await User.create({
          id: response.data.sub,
          displayName: response.data.name,
          pictureUrl: response.data.picture,
        });
      } else {
        // If user exists, update their information
        user.displayName = response.data.name;
        user.pictureUrl = response.data.picture;
        await user.save();
      }

      // Generate JWT token
      const jwtToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      return res
        .cookie("info", jwtToken, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 3600000, // 1 hour
        })
        .status(201)
        .json({
          status: "success",
          message: "User authenticated successfully",
          user: {
            id: user.id,
            displayName: user.displayName,
            pictureUrl: user.pictureUrl,
          },
        });
    } else {
      if (!code) {
        return res.status(400).json({ error: "Code is required" });
      }

      if (!state || state !== req.cookies.lineState) {
        return res.status(403).send("Invalid or missing state.");
      }

      //clear the state cookie
      res.clearCookie("lineState", {
        httpOnly: true,
        sameSite: process.env.NODE_ENV === "staging" ? "none" : "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 3600000, // 1 hour
      });

      const token = await axios.post(
        "https://api.line.me/oauth2/v2.1/token",
        {
          grant_type: "authorization_code",
          code: code,
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          redirect_uri: process.env.REDIRECT_URI,
        },
        { headers: { "content-type": "application/x-www-form-urlencoded" } }
      );

      const profile = await axios.get("https://api.line.me/v2/profile", {
        headers: {
          Authorization: `Bearer ${token.data.access_token}`,
        },
      });

      // Check if user exists in the database
      let user = await User.findOne({ where: { id: profile.data.userId } });

      if (!user) {
        // If user does not exist, create a new user
        user = await User.create({
          id: profile.data.userId,
          displayName: profile.data.displayName,
          pictureUrl: profile.data.pictureUrl,
        });
      } else {
        // If user exists, update their information
        user.displayName = profile.data.displayName;
        user.pictureUrl = profile.data.pictureUrl;
        await user.save();
      }

      // Generate JWT token
      const jwtToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      return res
        .cookie("info", jwtToken, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 3600000, // 1 hour
          domain: process.env.COOKIE_DOMAIN,
        })
        .status(201)
        .redirect(process.env.REDIRECT_URI_AFTER_LOGIN);
    }
  } catch (err) {
    res
      .status(500)
      .json({ error: "Internal Server Error", detail: err.message });
  }
}

async function authentication(req, res) {
  try {
    const state = generateState();

    res.cookie("lineState", state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600000, // 1 hour
      domain: process.env.COOKIE_DOMAIN,
    });

    const redirectUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.REDIRECT_URI}&state=${state}&scope=profile%20openid`;

    res.redirect(redirectUrl);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
}

async function logout(req, res) {
  try {
    res
      .clearCookie("info", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 3600000, // 1 hour
        domain: process.env.COOKIE_DOMAIN,
      })
      .status(200)
      .json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export { authentication, authorization, logout };
