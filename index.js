import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import { mkdirSync } from "fs";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import verifyAdminJwt from "./middlewares/verifyAdminJwt";
import { connect, sequelize } from "./config/database";
import { getAllowedCorsOrigins } from "./services/cors.config";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./swagger.json";

const app = express();
const allowedCorsOrigins = getAllowedCorsOrigins();

//import routes
import lineRouter from "./controllers/line.routes";
import googleRouter from "./controllers/google.routes";
import staffAuthRouter from "./controllers/staffAuth.routes";
import voucherRouter from "./controllers/voucher.routes";
import branchRouter from "./controllers/branch.routes";
import packageRouter from "./controllers/package.routes";
import bookingRouter from "./controllers/booking.routes";
import userBookingRouter from "./controllers/userbooking.routes";
import userRouter from "./controllers/users.routes"; // Import the user routes
import adminDasboardRouter from "./controllers/adminDashboard.routes"; // Import the admin dashboard routes
import calendarRouter from "./controllers/calendar.routes"; // Import the calendar routes
import userInfoRouter from "./controllers/userInfo.routes";
import userBranchRouter from "./controllers/userBranch.routes";
import userPackageRouter from "./controllers/userPackage.routes";
import userVoucherRouter from "./controllers/userVoucher.routes";
import reviewRouter from "./controllers/review.routes";
import userReviewRouter from "./controllers/userReview.routes";
import facebookRouter from "./controllers/facebook.routes";

//setup middlewares
app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) =>
      callback(null, !origin || allowedCorsOrigins.has(origin)),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/health/live", (_req, res) => res.status(200).json({ status: "ok" }));
app.get("/health/ready", async (_req, res) => {
  try {
    await sequelize.authenticate();
    return res.status(200).json({ status: "ready" });
  } catch {
    return res.status(503).json({ status: "unavailable" });
  }
});

//list of routes
//-=-=-=-should edit below this line to add your routes-=-=-=-=-//
app.get("/", (req, res) => {
  res.json({
    version: "1.3.10",
  });
});

app.use("/line", lineRouter);
app.use("/google", googleRouter);
app.use("/admin/auth", staffAuthRouter);
app.use("/admin/voucher", voucherRouter);
app.use("/admin/branch", branchRouter);
app.use("/admin/package", packageRouter);
app.use("/admin/booking", bookingRouter);
app.use("/booking", userBookingRouter);
app.use("/admin/user", userRouter); // Use the user routes
app.use("/admin/dashboard", adminDasboardRouter); // Use the admin dashboard routes
app.use("/admin/calendar", calendarRouter); // Use the calendar routes
app.use("/admin/review", reviewRouter);
app.use("/userinfo", userInfoRouter);
app.use("/branch", userBranchRouter);
app.use("/package", userPackageRouter);
app.use("/voucher", userVoucherRouter);
app.use("/review", userReviewRouter);
app.use("/facebook", facebookRouter);

//-=-=-=-=-should edit above this line to add your routes-=-=-=-=-//

const uploadsDirectory = path.resolve(process.cwd(), "uploads");
mkdirSync(uploadsDirectory, { recursive: true });

const uploadExtensions = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDirectory);
  },
  filename: function (req, file, cb) {
    const extension = uploadExtensions.get(file.mimetype);
    cb(null, uuidv4().toString() + Date.now() + extension);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!uploadExtensions.has(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, WebP, and GIF images are allowed."));
    }
    return cb(null, true);
  },
});

app.use("/uploads", express.static(uploadsDirectory));

//only admin can upload
app.post("/upload", verifyAdminJwt, upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).send("No file uploaded.");
    return;
  }
  res.json({ filePath: `${process.env.DOMAIN}/uploads/${req.file.filename}` });
});

// Swagger setup
if (process.env.NODE_ENV === "dev" || process.env.NODE_ENV === "staging") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

app.use((error, _req, res, next) => {
  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res.status(status).json({ error: status === 413 ? "Image must be 10 MB or smaller." : "Invalid upload." });
  }
  if (error.message === "Only JPEG, PNG, WebP, and GIF images are allowed.") {
    return res.status(400).json({ error: error.message });
  }
  return next(error);
});

const startServer = async () => {
  try {
    await connect();
    const port = Number(process.env.PORT || 8000);
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      if (process.env.NODE_ENV === "dev") {
        console.log("Running in development mode");
        console.log(`API documentation is available at http://localhost:${port}/api-docs`);
      }
    });
  } catch (error) {
    console.error("Server startup failed because the database is unavailable.", error);
    process.exitCode = 1;
  }
};

void startServer();
