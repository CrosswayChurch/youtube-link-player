const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve public folder (admin.html + embed.html)
app.use(express.static(path.join(__dirname, "public")));

const DATA_FILE = path.join(__dirname, "video.json");

const DEFAULT_DATA = {
  embedUrl: "",
  paused: false,
  ended: false,
};

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return {
      embedUrl: typeof parsed.embedUrl === "string" ? parsed.embedUrl : "",
      paused: !!parsed.paused,
      ended: !!parsed.ended,
    };
  } catch (err) {
    console.error("Error reading video.json:", err);
    return { ...DEFAULT_DATA };
  }
}

function writeData(data) {
  const normalized = {
    embedUrl: typeof data.embedUrl === "string" ? data.embedUrl : "",
    paused: !!data.paused,
    ended: !!data.ended,
  };
  fs.writeFileSync(DATA_FILE, JSON.stringify(normalized, null, 2), "utf8");
}

// GET current video state
app.get("/api/video", (req, res) => {
  res.json(readData());
});

// Update video URL and/or ended flag
app.post("/api/video", (req, res) => {
  const current = readData();
  const { embedUrl, ended } = req.body;

  if (typeof embedUrl === "string") {
    current.embedUrl = embedUrl;

    if (embedUrl === "") {
      // Clearing the link: not paused, ended stays whatever caller sets
      current.paused = false;
    } else {
      // New live stream implies "not ended"
      current.ended = false;
    }
  }

  if (typeof ended === "boolean") {
    current.ended = ended;
  }

  writeData(current);
  res.json({ success: true, ...current });
});

// Pause/unpause (Sunday School)
app.post("/api/pause", (req, res) => {
  const { paused } = req.body;
  if (typeof paused !== "boolean") {
    return res.status(400).json({ error: "paused (boolean) is required" });
  }

  const current = readData();
  current.paused = paused;

  writeData(current);
  res.json({ success: true, ...current });
});

// Fallback for unknown routes
app.use((req, res) => {
  res.status(404).send("Not found");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
