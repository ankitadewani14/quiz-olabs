const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const SECRET = "your-secret-key";
const PORT = 5000;

// MongoDB Connection
const mongoURI = "mongodb://localhost:27017/codeEditorDB"; // Change this URI if using a cloud MongoDB like Atlas
mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// MongoDB Models
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const EditorSchema = new mongoose.Schema({
  username: { type: String, required: true },
  html: { type: String, default: "" },
  css: { type: String, default: "" },
  js: { type: String, default: "" },
});

const User = mongoose.model("User", UserSchema);
const EditorData = mongoose.model("EditorData", EditorSchema);

// Signup API
app.post("/api/signup", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.send("Signup successful.");
  } catch (err) {
    if (err.code === 11000) return res.status(400).send("User already exists.");
    res.status(500).send("Error during signup.");
  }
});

// Login API
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).send("Invalid credentials.");
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).send("Invalid credentials.");
    const token = jwt.sign({ username }, SECRET);
    res.json({ token });
  } catch (err) {
    res.status(500).send("Error during login.");
  }
});

// Fetch Editor Data API
app.get("/api/fetch", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  try {
    const { username } = jwt.verify(token, SECRET);
    const editorData = await EditorData.findOne({ username });
    if (!editorData) return res.json({ html: "", css: "", js: "" });
    res.json(editorData);
  } catch (err) {
    res.status(401).send("Unauthorized.");
  }
});

// Save Editor Data API
app.post("/api/save", async (req, res) => {
  const token = req.headers.authorization.split(" ")[1];
  try {
    const { username } = jwt.verify(token, SECRET);
    const { html, css, js } = req.body;
    await EditorData.findOneAndUpdate(
      { username },
      { html, css, js },
      { upsert: true, new: true }
    );
    res.send("Data saved.");
  } catch (err) {
    res.status(500).send("Error saving data.");
  }
});

// Start Server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
