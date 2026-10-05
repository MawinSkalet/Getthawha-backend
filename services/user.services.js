import { User, Booking, Package, Branch, Voucher } from "../models/index";
import { Op } from "sequelize";

async function getAllUsers(req, res) {
  try {
    const { page = 1 } = req.query;
    const users = await User.findAll({
      attributes: ["id", "displayName", "pictureUrl", "email", "phone", "address", "createdAt", "updatedAt"],
      include: [
        {
          model: Booking,
          as: "bookings",
          attributes: ["id"],
          include: [
            {
              model: Package,
              as: "package",
              attributes: ["id", "title"],
            },
            {
              model: Branch,
              as: "branch",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
      limit: 10, // Assuming you want to paginate results
      offset: (page - 1) * 10, // Assuming 10 bookings per page
    });
    return res.status(200).json(users);
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching users",
    });
  }
}

async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      attributes: ["id", "displayName", "pictureUrl", "email", "phone", "address", "createdAt", "updatedAt"],
      include: [
        {
          model: Booking,
          as: "bookings",
          attributes: [
            "id",
            "date",
            "totalPrice",
            "status",
            "customerEmail",
            "customerName",
            "customerPhone",
            "createdAt",
          ],
          include: [
            {
              model: Package,
              as: "package",
              attributes: ["id", "title", "duration"],
            },
            {
              model: Branch,
              as: "branch",
              attributes: ["id", "name", "address"],
            },
            {
              model: Voucher,
              as: "voucher",
              attributes: ["id", "code", "discount"],
            },
          ],
        },
      ],
      order: [
        [{ model: Booking, as: "bookings" }, "date", "DESC"],
        [{ model: Booking, as: "bookings" }, "createdAt", "DESC"],
      ],
    });
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching the user",
    });
  }
}

async function updateUserById(req, res) {
  try {
    const { id } = req.params;
    const body = req.body && typeof req.body === "object" && !Array.isArray(req.body)
      ? req.body
      : {};
    const updates = {};

    if (Object.hasOwn(body, "displayName")) {
      const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
      if (!displayName || displayName.length > 180) {
        return res.status(400).json({
          status: "error",
          message: "Display name must be between 1 and 180 characters",
        });
      }
      updates.displayName = displayName;
    }

    if (Object.hasOwn(body, "email")) {
      const email = typeof body.email === "string" ? body.email.trim() : "";
      if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        return res.status(400).json({ status: "error", message: "Please provide a valid email address" });
      }
      updates.email = email || null;
    }

    if (Object.hasOwn(body, "phone")) {
      const phone = typeof body.phone === "string" ? body.phone.trim() : "";
      if (phone && (phone.length > 32 || !/^[\d+().\s-]{5,32}$/.test(phone))) {
        return res.status(400).json({ status: "error", message: "Please provide a valid phone number" });
      }
      updates.phone = phone || null;
    }

    if (Object.hasOwn(body, "address")) {
      const address = typeof body.address === "string" ? body.address.trim() : "";
      if (address.length > 500) {
        return res.status(400).json({ status: "error", message: "Address must be 500 characters or fewer" });
      }
      updates.address = address || null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ status: "error", message: "No profile fields were provided" });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found" });
    }

    await user.update(updates);
    return res.status(200).json(user);
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      return res.status(409).json({ status: "error", message: "That display name is already in use" });
    }
    return res.status(500).json({ status: "error", message: "An error occurred while updating the user" });
  }
}

async function searchUsers(req, res) {
  try {
    const { query } = req.query;
    const users = await User.findAll({
      where: {
        displayName: {
          [Op.iLike]: `%${query}%`,
        },
      },
      attributes: ["id", "displayName", "pictureUrl", "email", "phone", "address", "createdAt", "updatedAt"],
    });
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "An error occurred while searching for users",
    });
  }
}

export { getAllUsers, getUserById, updateUserById, searchUsers };
