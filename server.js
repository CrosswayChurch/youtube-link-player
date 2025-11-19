const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// This is the JSON file that stores the current embed URL
const DATA_FILE = path.join(__dirname, "video.json");

// Read current embed URL from JSON file
function readCurrentVideo() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed.embedUrl || "";
  } catch (err) {
    console.error("Error reading video.json:", err);
    return "";
  }
}

// Write new embed URL to JSON file
function writeCurrentVideo(embedUrl) {
  const data = { embedUrl };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

// ----- API ROUTES -----

// GET: current video URL
app.get("/api/video", (req, res) => {
  const embedUrl = readCurrentVideo();
  res.json({ embedUrl });
});

// POST: update video URL
app.post("/api/video", (req, res) => {
  const { embedUrl } = req.body;
  if (!embedUrl || typeof embedUrl !== "string") {
    return res.status(400).json({ error: "embedUrl is required" });
  }
  try {
    writeCurrentVideo(embedUrl);
    res.json({ success: true, embedUrl });
  } catch (err) {
    console.error("Error writing video.json:", err);
    res.status(500).json({ error: "Failed to save video URL" });
  }
});

// ----- STATIC FILES -----
app.use(express.static(path.join(__dirname, "public")));

// Explicit routes for admin and embed pages
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.get("/embed", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "embed.html"));
});

// Optional: redirect root to admin page
app.get("/", (req, res) => {
  res.redirect("/admin");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
