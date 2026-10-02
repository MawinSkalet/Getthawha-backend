import { Package } from "../models/index";

function normalizePackageInput(body = {}) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const price = Number(body.price);
  const duration = Number(body.duration);
  const type = body.type;

  if (
    !title ||
    !description ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !Number.isInteger(duration) ||
    duration <= 0 ||
    !["service", "promotion"].includes(type) ||
    (body.pictureUrl != null && typeof body.pictureUrl !== "string") ||
    (body.note != null && typeof body.note !== "string")
  ) {
    return null;
  }

  return {
    title,
    description,
    price,
    duration,
    pictureUrl:
      typeof body.pictureUrl === "string" && body.pictureUrl.trim()
        ? body.pictureUrl.trim()
        : null,
    note:
      typeof body.note === "string" && body.note.trim()
        ? body.note.trim()
        : null,
    type,
  };
}

function invalidPackageResponse(res) {
  return res.status(400).json({
    status: "error",
    message: "Invalid package data provided",
  });
}

function packageResponse(packageRecord) {
  return {
    id: packageRecord.id,
    title: packageRecord.title,
    description: packageRecord.description,
    price: packageRecord.price,
    duration: packageRecord.duration,
    pictureUrl: packageRecord.pictureUrl,
    note: packageRecord.note,
    type: packageRecord.type,
  };
}

async function getAllPackage(req, res) {
  try {
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
  const packageInput = normalizePackageInput(req.body);
  if (!packageInput) return invalidPackageResponse(res);

  try {
    const newPackage = await Package.create(packageInput);
    return res.status(201).json(packageResponse(newPackage));
  } catch (error) {
    console.error("Error creating package:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while creating the package",
    });
  }
}

async function updatePackage(req, res) {
  const packageInput = normalizePackageInput(req.body);
  if (!packageInput) return invalidPackageResponse(res);

  try {
    const packageRecord = await Package.findByPk(req.params.id);
    if (!packageRecord || packageRecord.deletedAt) {
      return res.status(404).json({
        status: "error",
        message: "Package not found",
      });
    }

    await packageRecord.update(packageInput);
    return res.status(200).json(packageResponse(packageRecord));
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
    const packageRecord = await Package.findByPk(req.params.id);
    if (!packageRecord || packageRecord.deletedAt) {
      return res.status(404).json({
        status: "error",
        message: "Package not found",
      });
    }

    // Keep the row for booking history while removing it from active catalogs.
    await packageRecord.update({ deletedAt: new Date(), isActive: false });
    return res.status(204).json();
  } catch (error) {
    console.error("Error deleting package:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while deleting the package",
    });
  }
}

export { getAllPackage, createPackage, updatePackage, deletePackage };
