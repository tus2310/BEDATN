// src/index.ts
import express, { Request, Response, Router } from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import User from "./user";
// import upload from "./upload";
import { Uploadfile } from "./upload";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
const http = require("http");
const socketIo = require("socket.io");
var cors = require("cors");
const fs = require("fs");
require("dotenv").config();
const nodemailer = require("nodemailer");
const asyncHandler = require("express-async-handler");
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const { uploadPhoto } = require("./middleware/uploadImage.js");
const PORT = process.env.PORT || 28017;
const {
  cloudinaryUploadImg,
  cloudinaryDeleteImg,
} = require("./utils/Cloudinary");
const JWT_SECRET = process.env.JWT_SECRET as string;
const router = Router();
mongoose
  .connect(
   "mongodb+srv://ungductrungtrung:Jerry2912@cluster0.4or3syc.mongodb.net/",
    {
      //   useNewUrlParser: true,
      //   useUnifiedTopology: true,
    }
  )
  .then(() => console.log("DB connection successful"))
  .catch((err) => console.log(err));

app.use(cors());
app.use(bodyParser.json());

// Định nghĩa kiểu cho userSockets
interface UserSockets {
  [userId: string]: string; // userId  tới socket.id
}


app.post(
  "/upload",
  uploadPhoto.array("images", 10),
  async (req: any, res: any) => {
    console.log("Files received in backend:", req.files);
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    try {
      const uploader = (path: any) => cloudinaryUploadImg(path);
      const urls = [];
      for (const file of req.files) {
        const { path } = file;
        const newpath = await uploader(path);
        urls.push(newpath);
        fs.unlinkSync(path); // Remove file after upload
      }

      res.status(201).json({
        payload: urls,
        status: 200,
      });
    } catch (error: any) {
      console.error("Upload error:", error.message);
      res.status(500).json({ error: error.message });
    }
  }
);
app.get("/users", async (req: Request, res: Response) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Lỗi lấy thông tin người dùng!",
    });
  }
});

app.get("/user/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId); // Fetch user by ID

    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }

    res.json(user); // Respond with the user's data
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({
      message: "Error fetching user information!",
    });
  }
});

// Login
app.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }

    if (!user.active) {
      return res.status(403).json({
        message: "Account is disabled. Please contact support.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password!" });
    }

    const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, {
      expiresIn: process.env.EXPIRES_TOKEN,
    });

    if (user.role === "admin") {
      res.json({
        message: "Welcome Admin!",
        id: user._id,
        info: {
          email: user.email,
          role: user.role,
          name: user.name,
        },
        token: token,
        expiresIn: process.env.EXPIRES_TOKEN,
      });
    } else if (user.role === "shipper") {
      res.json({
        message: "Welcome Shipper!",
        id: user._id,
        info: {
          email: user.email,
          role: user.role,
          name: user.name,
        },
        token: token,
        expiresIn: process.env.EXPIRES_TOKEN,
      });
    } else {
      res.json({
        message: "Welcome User!",
        id: user._id,
        info: {
          email: user.email,
          role: user.role,
          name: user.name,
        },
        token: token,
        expiresIn: process.env.EXPIRES_TOKEN,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error logging in!" });
  }
});

app.post("/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();
    res.status(201).json({
      message: "Thêm người dùng thành công",
      user: newUser,
      status: 200,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi khi tạo người dùng mới" });
  }
});




app.listen(PORT, () => {
  console.log(`Server đang lắng nghe tại cổng ${PORT}`);
});

