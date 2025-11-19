const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const DATA_FILE = path.join(__dirname, "video.json");

// Read current embed URL
function readCurrentVideo() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed.embedUrl || "";
  } catch {
    return "";
  }
}

// Write embed URL
function writeCurrentVideo(embedUrl) {
  const data = { embedUrl };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

// GET current video
app.get("/api/video", (req, res) => {
  const embedUrl = readCurrentVideo();
  res.json({ embedUrl });
});

// POST new video (including clearing)
app.post("/api/video", (req, res) => {
  let { embedUrl } = req.body;

  // Allow clearing the URL
  if (embedUrl === undefined || embedUrl === null) {
    return res.status(400).json({ error: "embedUrl missing" });
  }

  // Save the new (or empty) URL
  writeCurrentVideo(embedUrl);
  res.json({ success: true, embedUrl });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
