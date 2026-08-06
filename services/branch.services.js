import { Branch } from "../models/index";

async function getAllBranch(req, res) {
  try {
    // Fetch all branches from the database
    const branches = await Branch.findAll({
      attributes: [
        "id",
        "name",
        "address",
        "googleMapUrl",
        "phone",
        "googleMapEmbedUrl",
        "pictureUrl",
        "description",
      ],
      where: { deletedAt: null },
    });
    return res.status(200).json(branches);
  } catch (error) {
    console.error("Error fetching branches:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching branches",
    });
  }
}

async function createBranch(req, res) {
  try {
    const {
      name,
      address,
      googleMapUrl,
      googleMapEmbedUrl,
      phone,
      pictureUrl,
      description,
    } = req.body;
    // Validate input
    if (
      !name ||
      !address ||
      !googleMapUrl ||
      !phone ||
      !googleMapEmbedUrl ||
      !pictureUrl ||
      !description
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid branch data provided",
      });
    }

    // Create a new branch
    const newBranch = await Branch.create({
      name,
      address,
      googleMapUrl,
      phone,
      pictureUrl,
      googleMapEmbedUrl,
      description,
    });
    const response = {
      id: newBranch.id,
      name: newBranch.name,
      address: newBranch.address,
      googleMapUrl: newBranch.googleMapUrl,
      phone: newBranch.phone,
      googleMapEmbedUrl: newBranch.googleMapEmbedUrl,
      pictureUrl: newBranch.pictureUrl,
      description: newBranch.description,
    };
    return res.status(201).json(response);
  } catch (error) {
    console.error("Error creating branch:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while creating the branch",
    });
  }
}

async function updateBranch(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      googleMapUrl,
      phone,
      googleMapEmbedUrl,
      pictureUrl,
      description,
    } = req.body;
    // Validate input
    if (
      !name ||
      !address ||
      !googleMapUrl ||
      !phone ||
      !googleMapEmbedUrl ||
      !pictureUrl ||
      !description
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid branch data provided",
      });
    }

    // Find the branch by ID and update it
    const branch = await Branch.findByPk(id);
    if (!branch) {
      return res.status(404).json({
        status: "error",
        message: "Branch not found",
      });
    }
    await branch.update({
      id,
      name,
      address,
      googleMapUrl,
      phone,
      googleMapEmbedUrl,
      pictureUrl,
      description,
    });
    const response = {
      id: branch.id,
      name: branch.name,
      address: branch.address,
      googleMapUrl: branch.googleMapUrl,
      phone: branch.phone,
      googleMapEmbedUrl: branch.googleMapEmbedUrl,
      pictureUrl: branch.pictureUrl,
      description: branch.description,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error updating branch:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while updating the branch",
    });
  }
}

async function deleteBranch(req, res) {
  try {
    const { id } = req.params;

    // Find the branch by ID
    const branch = await Branch.findByPk(id);
    if (!branch) {
      return res.status(404).json({
        status: "error",
        message: "Branch not found",
      });
    }
    // Delete the branch

    // Soft delete: set a deletedAt timestamp instead of removing the record
    await branch.update({ deletedAt: new Date() });
    await branch.update({ isActive: false });

    return res.status(204).json(); // No content to return
  } catch (error) {
    console.error("Error deleting branch:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while deleting the branch",
    });
  }
}
export { getAllBranch, createBranch, updateBranch, deleteBranch };
