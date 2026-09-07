import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import verifyAdminJwt from "./middlewares/verifyAdminJwt";
import { connect, sync } from "./config/database";
import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./swagger.json";

dotenv.config();

const app = express();

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
app.use(cookieParser());
app.use(
  cors({
    origin: [
      ...(process.env.FRONTEND_ORIGIN ? [new URL(process.env.FRONTEND_ORIGIN).origin] : []),
      "http://localhost:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://admin-getthawha.yungying.com",
      "https://client-getthawha.yungying.com",
      "https://liff-getthawha.yungying.com",
      "https://getthawha.com",
      "https://www.getthawha.com",
      "https://yunggotit.getthawha.com",
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json({ limit: "100mb" }));

// Connect to the database
async function initializeDatabase() {
  await connect();
  await sync();
}
initializeDatabase();

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

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    //make the file name unique by hashing the current date and time gene uuid
    const extension = path.extname(file.originalname);
    cb(null, uuidv4().toString() + Date.now() + extension);
  },
});

const upload = multer({ storage: storage });

app.use("/uploads", express.static("uploads"));

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

app.listen(process.env.PORT, () => {
  console.log(`Server is running at http://localhost:${process.env.PORT}`);
  if (process.env.NODE_ENV === "dev") {
    console.log("Running in development mode");
    console.log(
      `API documentation is available at http://localhost:${process.env.PORT}/api-docs`
    );
  }
});
