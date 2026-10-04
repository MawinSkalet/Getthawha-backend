import { Package } from "../models/index";

const PACKAGE_DURATIONS = [60, 90, 120];

function basePackageTitle(title = "") {
  const value = typeof title === "string" ? title : "";
  return value.replace(/\s*\(\d+\s*mins?\)\s*$/i, "").trim();
}

function inferPackageCategory(title = "", type = "service") {
  const normalizedTitle = basePackageTitle(title).toLocaleLowerCase();
  if (type === "promotion") return "The Best Massage";
  if (/hot stone|หินร้อน/.test(normalizedTitle)) return "Premium Experience";
  if (/traditional lanna herbal|oil massage \+ herbal compress|aroma oil \+ herbal compress|ประคบสมุนไพร พิเศษ|น้ำมัน ประคบสมุนไพร/.test(normalizedTitle)) {
    return "Traditional Lanna Massage";
  }
  if (/foot massage|นวดเท้า/.test(normalizedTitle)) return "Foot Massage";
  if (/back \+ shoulder massage|head, back & shoulder massage|นวดหลังไหล่|นวดศีรษะ หลัง ไหล่/.test(normalizedTitle)) {
    return "Head, Back & Shoulder Massage";
  }
  if (/oil massage|aroma oil|coconut oil|body scrub|ขัดผิว|นวดน้ำมัน/.test(normalizedTitle)) {
    return "Nourishing Treatment Massage";
  }
  if (/thai massage|นวดไทย|thai lanna/.test(normalizedTitle)) return "Thai Massage";
  return "Other";
}

function plainPackage(packageRecord) {
  return typeof packageRecord.get === "function"
    ? packageRecord.get({ plain: true })
    : packageRecord;
}

function packageResponse(packageRecord) {
  const record = plainPackage(packageRecord);
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    price: record.price,
    duration: record.duration,
    pictureUrl: record.pictureUrl,
    note: record.note,
    type: record.type,
    category: record.category || inferPackageCategory(record.title, record.type),
    isActive: record.isActive !== false,
  };
}

function normalizePackageInput(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
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
    (body.category != null && typeof body.category !== "string") ||
    (body.pictureUrl != null && typeof body.pictureUrl !== "string") ||
    (body.note != null && typeof body.note !== "string") ||
    (body.isActive !== undefined && typeof body.isActive !== "boolean")
  ) {
    return null;
  }

  const packageInput = {
    title,
    description,
    price,
    duration,
    pictureUrl:
      typeof body.pictureUrl === "string" && body.pictureUrl.trim()
        ? body.pictureUrl.trim()
        : null,
    note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : null,
    type,
    category: typeof body.category === "string" && body.category.trim()
      ? body.category.trim()
      : null,
  };

  if (typeof body.isActive === "boolean") {
    packageInput.isActive = body.isActive;
  }

  return packageInput;
}

function normalizePackageGroupInput(body = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const title = basePackageTitle(body.title);
  const fields = normalizePackageInput({
    ...body,
    title: `${title} (60 mins)`,
    price: 1,
    duration: 60,
  });
  const variants = Array.isArray(body.variants)
    ? body.variants.map((variant) => ({
        duration: Number(variant?.duration),
        price: Number(variant?.price),
      }))
    : [];

  if (
    !fields ||
    !title ||
    !fields.category ||
    variants.length === 0 ||
    variants.some(
      (variant) =>
        !PACKAGE_DURATIONS.includes(variant.duration) ||
        !Number.isFinite(variant.price) ||
        variant.price <= 0
    ) ||
    new Set(variants.map((variant) => variant.duration)).size !== variants.length
  ) {
    return null;
  }

  return { ...fields, title, variants };
}

function invalidPackageResponse(res) {
  return res.status(400).json({
    status: "error",
    message: "Enter a title, description, category, valid price and duration.",
  });
}

function isUniqueTitleConflict(error) {
  return (
    error?.name === "SequelizeUniqueConstraintError" ||
    error?.original?.code === "23505" ||
    error?.code === "23505"
  );
}

function packageConflictResponse(res) {
  return res.status(409).json({
    status: "error",
    message: "A package with that exact name already exists. Edit the existing item or use a different name.",
  });
}

function categoryForRecord(record) {
  const value = plainPackage(record);
  return value.category || inferPackageCategory(value.title, value.type);
}

function isSameGroup(record, title, category) {
  const value = plainPackage(record);
  return (
    basePackageTitle(value.title).toLocaleLowerCase() === title.toLocaleLowerCase() &&
    categoryForRecord(record) === category
  );
}

function variantTitle(title, duration) {
  return `${title} (${duration} mins)`;
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
        "category",
        "isActive",
      ],
      where: { deletedAt: null },
    });
    return res.status(200).json(packages.map(packageResponse));
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
    if (isUniqueTitleConflict(error)) return packageConflictResponse(res);
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
    if (isUniqueTitleConflict(error)) return packageConflictResponse(res);
    console.error("Error updating package:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while updating the package",
    });
  }
}

async function savePackageGroup(req, res, isUpdate) {
  const groupInput = normalizePackageGroupInput(req.body);
  if (!groupInput) return invalidPackageResponse(res);

  let transaction;
  try {
    transaction = await Package.sequelize.transaction();
    const allRecords = await Package.findAll({ transaction });
    let existingGroup = [];
    let originalTitle = groupInput.title;
    let originalCategory = groupInput.category;

    if (isUpdate) {
      const anchor = await Package.findByPk(req.params.id, { transaction });
      if (!anchor || anchor.deletedAt) {
        await transaction.rollback();
        return res.status(404).json({
          status: "error",
          message: "Package group not found",
        });
      }
      originalTitle = basePackageTitle(anchor.title);
      originalCategory = categoryForRecord(anchor);
      existingGroup = allRecords.filter(
        (record) =>
          !plainPackage(record).deletedAt &&
          isSameGroup(record, originalTitle, originalCategory)
      );
    } else {
      existingGroup = allRecords.filter(
        (record) =>
          !plainPackage(record).deletedAt &&
          isSameGroup(record, groupInput.title, groupInput.category)
      );
      if (existingGroup.length > 0) {
        await transaction.rollback();
        return res.status(409).json({
          status: "error",
          message: "A service with this name already exists. Edit its duration and prices instead.",
        });
      }
    }

    const groupHistory = allRecords.filter((record) =>
      isSameGroup(record, originalTitle, originalCategory)
    );
    const savedRecords = [];
    const requestedDurations = new Set();

    for (const variant of groupInput.variants) {
      const title = variantTitle(groupInput.title, variant.duration);
      requestedDurations.add(variant.duration);
      let record = groupHistory.find(
        (item) => Number(plainPackage(item).duration) === variant.duration
      );

      if (!record) {
        const titleMatch = allRecords.find(
          (item) => plainPackage(item).title === title
        );
        if (titleMatch && !plainPackage(titleMatch).deletedAt) {
          await transaction.rollback();
          return packageConflictResponse(res);
        }
        record = titleMatch;
      }

      const values = {
        title,
        description: groupInput.description,
        price: variant.price,
        duration: variant.duration,
        pictureUrl: groupInput.pictureUrl,
        note: groupInput.note,
        type: groupInput.type,
        category: groupInput.category,
        isActive: groupInput.isActive !== false,
        deletedAt: null,
      };

      if (record) {
        await record.update(values, { transaction });
      } else {
        record = await Package.create(values, { transaction });
      }
      savedRecords.push(record);
    }

    const now = new Date();
    for (const record of existingGroup) {
      if (!requestedDurations.has(Number(plainPackage(record).duration))) {
        await record.update(
          { deletedAt: now, isActive: false },
          { transaction }
        );
      }
    }

    await transaction.commit();
    return res.status(isUpdate ? 200 : 201).json(savedRecords.map(packageResponse));
  } catch (error) {
    if (transaction) await transaction.rollback();
    if (isUniqueTitleConflict(error)) return packageConflictResponse(res);
    console.error("Error saving package group:", error);
    return res.status(500).json({
      status: "error",
      message: "Could not save the menu item. Please try again.",
    });
  }
}

async function createPackageGroup(req, res) {
  return savePackageGroup(req, res, false);
}

async function updatePackageGroup(req, res) {
  return savePackageGroup(req, res, true);
}

async function deletePackageGroup(req, res) {
  let transaction;
  try {
    transaction = await Package.sequelize.transaction();
    const anchor = await Package.findByPk(req.params.id, { transaction });
    if (!anchor || anchor.deletedAt) {
      await transaction.rollback();
      return res.status(404).json({
        status: "error",
        message: "Package group not found",
      });
    }

    const title = basePackageTitle(anchor.title);
    const category = categoryForRecord(anchor);
    const allRecords = await Package.findAll({ transaction });
    const groupRecords = allRecords.filter(
      (record) =>
        !plainPackage(record).deletedAt && isSameGroup(record, title, category)
    );

    for (const record of groupRecords) {
      await record.update(
        { deletedAt: new Date(), isActive: false },
        { transaction }
      );
    }

    await transaction.commit();
    return res.status(204).json();
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Error deleting package group:", error);
    return res.status(500).json({
      status: "error",
      message: "Could not delete the menu item. Please try again.",
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

export {
  getAllPackage,
  createPackage,
  updatePackage,
  deletePackage,
  createPackageGroup,
  updatePackageGroup,
  deletePackageGroup,
};
