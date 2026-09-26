import { Package } from "../models/index";

async function getAllPackage(req, res) {
  try {
    // Fetch all package from the database
    const packages = await Package.findAll({
      attributes: [
        "id",
        "title",
        "description",
        "price",
        "duration",
        "pictureUrl",
        "note",
        "type",
        "isActive",
      ],
      where: { deletedAt: null },
    });
    return res.status(200).json(packages);
  } catch (error) {
    console.error("Error fetching package:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching package",
    });
  }
}

async function createPackage(req, res) {
  try {
    const { title, description, price, duration, pictureUrl, note, type } =
      req.body;
    // Validate input
    if (!title || !description || !price || !duration || !pictureUrl || !type) {
      return res.status(400).json({
        status: "error",
        message: "Invalid package data provided",
      });
    }

    // Create a new Package
    const newPackage = await Package.create({
      title,
      description,
      price,
      duration,
      pictureUrl,
      note,
      type,
    });
    const response = {
      id: newPackage.id,
      title: newPackage.title,
      description: newPackage.description,
      price: newPackage.price,
      duration: newPackage.duration,
      pictureUrl: newPackage.pictureUrl,
      note: newPackage.note,
      type: newPackage.type,
    };
    return res.status(201).json(response);
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "An error occurred while creating the package",
    });
  }
}

async function updatePackage(req, res) {
  try {
    const { id } = req.params;
    const { title, description, price, duration, pictureUrl, note, type } =
      req.body;
    // Validate input
    if (!title || !description || !price || !duration || !pictureUrl || !type) {
      return res.status(400).json({
        status: "error",
        message: "Invalid package data provided",
      });
    }

    const _package = await Package.findByPk(id);
    if (!_package) {
      return res.status(404).json({
        status: "error",
        message: "Package not found",
      });
    }
    await _package.update({
      title,
      description,
      price,
      duration,
      pictureUrl,
      note,
      type,
    });
    const response = {
      id: _package.id,
      title: _package.title,
      description: _package.description,
      price: _package.price,
      duration: _package.duration,
      pictureUrl: _package.pictureUrl,
      note: _package.note,
      type: _package.type,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error updating package:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while updating the package",
    });
  }
}

async function deletePackage(req, res) {
  try {
    const { id } = req.params;

    // Find the branch by ID
    const _Package = await Package.findByPk(id);
    if (!_Package) {
      return res.status(404).json({
        status: "error",
        message: "Package not found",
      });
    }

    // await _Package.destroy();

    await _Package.update({ deletedAt: new Date() });
    await _Package.update({ isActive: false });

    return res.status(204).json(); // No content to return
  } catch (error) {
    console.error("Error deleting package:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while deleting the package",
    });
  }
}
export { getAllPackage, createPackage, updatePackage, deletePackage };
