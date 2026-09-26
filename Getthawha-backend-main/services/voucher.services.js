import { Voucher } from "../models/index";

async function getAllVoucher(req, res) {
  try {
    // Fetch all vouchers from the database
    const vouchers = await Voucher.findAll({
      attributes: ["id", "code", "discount", "isExpired"],
    });
    return res.status(200).json(vouchers);
  } catch (error) {
    console.error("Error fetching vouchers:", error);
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching vouchers",
    });
  }
}

async function createVoucher(req, res) {
  try {
    const { code, discount, isExpired } = req.body;

    // Validate input
    if (!code || !discount || isExpired === undefined) {
      return res.status(400).json({
        status: "error",
        message: "Invalid voucher data provided",
      });
    }

    // Create a new voucher
    const newVoucher = await Voucher.create({
      code,
      discount,
      isExpired,
    });
    const response = {
      id: newVoucher.id,
      code: newVoucher.code,
      discount: newVoucher.discount,
      isExpired: newVoucher.isExpired,
    };
    return res.status(201).json(response);
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "An error occurred while creating the voucher",
    });
  }
}

async function updateVoucher(req, res) {
  try {
    const { id } = req.params;
    const { code, discount, isExpired } = req.body;

    // Validate input
    if (!code || !discount || isExpired === undefined) {
      return res.status(400).json({
        status: "error",
        message: "Invalid voucher data provided",
      });
    }

    // Find the voucher by ID
    const voucher = await Voucher.findByPk(id);
    if (!voucher) {
      return res.status(404).json({
        status: "error",
        message: "Voucher not found",
      });
    }

    // Update the voucher
    voucher.code = code;
    voucher.discount = discount;
    voucher.isExpired = isExpired;
    await voucher.save();

    return res.status(200).json({
      id: voucher.id,
      code: voucher.code,
      discount: voucher.discount,
      isExpired: voucher.isExpired,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "An error occurred while updating the voucher",
    });
  }
}

async function deleteVoucher(req, res) {
  try {
    const { id } = req.params;

    // Find the voucher by ID
    const voucher = await Voucher.findByPk(id);
    if (!voucher) {
      return res.status(404).json({
        status: "error",
        message: "Voucher not found",
      });
    }

    // Delete the voucher
    // await voucher.destroy();
    await voucher.update({ isExpired: true });

    return res.status(204).json();
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "An error occurred while deleting the voucher",
    });
  }
}

async function checkVoucherValidity(req, res) {
  try {
    const { code } = req.params;

    // Find the voucher by code
    const voucher = await Voucher.findOne({ where: { code } });
    if (!voucher) {
      return res.status(404).json({
        status: "error",
        message: "Voucher not found",
      });
    }

    // Check if the voucher is expired
    if (voucher.isExpired) {
      return res.status(400).json({
        status: "error",
        message: "Voucher is expired",
      });
    }

    return res.status(200).json({
      id: voucher.id,
      code: voucher.code,
      discount: voucher.discount,
      isExpired: voucher.isExpired,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "An error occurred while checking voucher validity",
    });
  }
}

export {
  getAllVoucher,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  checkVoucherValidity,
};
