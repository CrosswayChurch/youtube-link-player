const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve public folder (admin.html + embed.html)
app.use(express.static(path.join(__dirname, "public")));

const DATA_FILE = path.join(__dirname, "video.json");

// Default structure if file is missing or invalid
const DEFAULT_DATA = {
  embedUrl: "",
  paused: false,
};

// Read full data (embedUrl + paused)
function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { ...DEFAULT_DATA };
  }
}

// Save full data to file
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

// GET current video + pause state
app.get("/api/video", (req, res) => {
  const data = readData();
  res.json(data);
});

// POST new video (does not change paused flag)
app.post("/api/video", (req, res) => {
  const data = readData();
  data.embedUrl = req.body.embedUrl || "";
  writeData(data);
  res.json({ success: true, ...data });
});

// POST pause/resume flag
app.post("/api/pause", (req, res) => {
  const data = readData();
  data.paused = !!req.body.paused;
  writeData(data);
  res.json({ success: true, ...data });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).send("Not found");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
