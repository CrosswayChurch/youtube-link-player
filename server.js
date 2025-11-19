const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve public folder (admin.html + embed.html)
app.use(express.static(path.join(__dirname, "public")));

const DATA_FILE = path.join(__dirname, "video.json");

// Read current embed URL from file
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

// Save embed URL to file
function writeCurrentVideo(embedUrl) {
  const data = { embedUrl };
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

// GET current video URL
app.get("/api/video", (req, res) => {
  res.json({ embedUrl: readCurrentVideo() });
});

// POST new video URL OR clear it
app.post("/api/video", (req, res) => {
  let { embedUrl } = req.body;

  // Allow clearing
  if (embedUrl === "") {
    writeCurrentVideo("");
    return res.json({ success: true, embedUrl: "" });
  }

  if (!embedUrl || typeof embedUrl !== "string") {
    return res.status(400).json({ error: "embedUrl is required" });
  }

  writeCurrentVideo(embedUrl);
  res.json({ success: true, embedUrl });
});

// Fallback for unknown routes (optional)
app.use((req, res) => {
  res.status(404).send("Not found");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
