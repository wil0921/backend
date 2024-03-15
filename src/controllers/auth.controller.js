const twilio = require("twilio");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const User = require("../models/users.model");
const OTPVerification = require("../models/OTPVerification.model");
require("dotenv").config();
/* dotenv itu package buat nyimpen data yang ga boleh di publish, kayak configurasi twilio
cara pakenya dengan menginstall donenv dan membuat file .env
oh iya konfigurasi twilionya udah di pindah ke file .env */

// Register controller
const register = async (req, res) => {
  const { phoneNumber, username, password } = req.body;
  const user = await User.find({ phoneNumber });

  // authentication
  if (user.length) {
    return res.status(400).json({ message: "Nomor telepon sudah terdaftar" });
  }

  //hashing password
  const saltRounds = 10;
  const hashedPassword = bcrypt.hash(password, saltRounds);

  // input user into db
  const newUser = new User({
    phoneNumber,
    username,
    password: hashedPassword,
    verified: false,
  });

  // saving user into db (will return the new user)
  try {
    await newUser.save();
    // sending otp into new user
    sendOTPVerification(newUserData, res);
  } catch (err) {
    console.error("Error saving data:", err);
    res.status(400).json({ message: err.message });
  }
};

const sendOTPVerification = async ({ _id, phoneNumber }, res) => {
  // create otp
  const otp = Math.floor(100000 + Math.random() * 900000);
  // twilio config
  const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
  const ACCOUNT_ID = process.env.ACCOUNT_ID;
  const AUTH_TOKEN = process.env.AUTH_TOKEN;
  const TWILIO_CLIENT = twilio(ACCOUNT_ID, AUTH_TOKEN);

  try {
    // send otp using twilio
    await TWILIO_CLIENT.messages.create({
      body: `Kode OTP Anda: ${otp}`,
      from: TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    //hashing otp
    const saltRounds = 10;
    const hashedOTP = bcrypt.hash(otp, saltRounds);

    // input otp into db
    const newOTPVerification = new OTPVerification({
      userId: _id,
      otp: hashedOTP,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000, // expires in 1 hour
    });

    // saving otp into db
    await newOTPVerification.save();

    res
      .status(200)
      .json({ message: "Kode OTP telah dikirimkan ke nomor telepon Anda" });
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ message: "Terjadi kesalahan saat mengirimkan OTP" });
  }
};

// Verify User controller
const verifyAuth = (req, res) => {
  const { phoneNumber, otp } = req.body;
  // search user by phone number
  const user = usersModel.users.find((u) => u.phoneNumber === phoneNumber);

  // authentication
  if (!user || user.otp !== otp) {
    return res.status(401).json({ message: "Kode OTP tidak valid" });
  }

  //generate jwt token
  const token = jwt.sign({ userId: user.id }, "secret_key", {
    expiresIn: "1h",
  });

  res.json({ token });
};

// Login controller
const login = (req, res) => {
  const { phoneNumber, password } = req.body;
  // search user by phone number
  const user = usersModel.users.find((u) => u.phoneNumber === phoneNumber);

  // authentication
  if (!user || user.password !== password) {
    return res
      .status(401)
      .json({ message: "Nomor telepon atau password salah" });
  }

  //generate jwt token
  const token = jwt.sign({ userId: user.id }, "secret_key", {
    expiresIn: "1h",
  });

  res.json({ token });
};

// Secure User controller
const secureAuth = (req, res) => {
  res.json({ message: "Akses diizinkan" });
};

//menggabungkan semua auth controller kedalam 1 variabel agar mudah dikelola
const authController = { register, verifyAuth, login, secureAuth };
module.exports = authController;
