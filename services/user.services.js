import { User, Booking, Package, Branch } from "../models/index";
import { Op } from "sequelize";

async function getAllUsers(req, res) {
  try {
    const { page = 1 } = req.query;
    const users = await User.findAll({
      attributes: ["id", "displayName", "pictureUrl", "createdAt", "updatedAt"],
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
      attributes: ["id", "displayName", "pictureUrl", "createdAt", "updatedAt"],
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

async function searchUsers(req, res) {
  try {
    const { query } = req.query;
    const users = await User.findAll({
      where: {
        displayName: {
          [Op.iLike]: `%${query}%`,
        },
      },
      attributes: ["id", "displayName", "pictureUrl", "createdAt", "updatedAt"],
    });
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "An error occurred while searching for users",
    });
  }
}

export { getAllUsers, getUserById, searchUsers };
