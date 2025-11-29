// server.js
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve public folder (admin.html + embed.html)
app.use(express.static(path.join(__dirname, "public")));

const DATA_FILE = path.join(__dirname, "video.json");

// How long the “ended” message should show (5 minutes)
const ENDED_WINDOW_MS = 5 * 60 * 1000;

// ---- Helpers to read/write state ---------------------------------

function readVideoData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);

    return {
      embedUrl: parsed.embedUrl || "",
      paused: !!parsed.paused,
      ended: !!parsed.ended,
      endedAt: typeof parsed.endedAt === "number" ? parsed.endedAt : null
    };
  } catch (err) {
    console.error("Error reading video.json:", err);
    // default state
    return {
      embedUrl: "",
      paused: false,
      ended: false,
      endedAt: null
    };
  }
}

function writeVideoData(data) {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(
      {
        embedUrl: data.embedUrl || "",
        paused: !!data.paused,
        ended: !!data.ended,
        endedAt: data.endedAt || null
      },
      null,
      2
    ),
    "utf8"
  );
}

// ---- API ROUTES --------------------------------------------------

// GET current video state
app.get("/api/video", (req, res) => {
  const data = readVideoData();

  let ended = false;

  if (data.endedAt) {
    const diff = Date.now() - data.endedAt;

    if (diff <= ENDED_WINDOW_MS) {
      // still within 5-minute window → show “ended” message
      ended = true;
    } else {
      // older than 5 minutes → clear ended state
      data.ended = false;
      data.endedAt = null;
      writeVideoData(data);
      ended = false;
    }
  } else {
    ended = !!data.ended;
  }

  res.json({
    embedUrl: data.embedUrl || "",
    paused: !!data.paused,
    ended
  });
});

// POST new video URL / update ended flag
// - Start Stream:  { embedUrl: "<youtube-embed-url>" }
// - End Stream:    { embedUrl: "", ended: true }
app.post("/api/video", (req, res) => {
  const { embedUrl, ended } = req.body;
  const data = readVideoData();

  if (typeof embedUrl === "string") {
    data.embedUrl = embedUrl;

    // If we’re starting a new stream, clear ended + paused
    if (embedUrl.trim() !== "") {
      data.ended = false;
      data.endedAt = null;
      data.paused = false;
    }
  }

  // When admin clicks “End Stream”
  if (ended === true) {
    data.embedUrl = "";        // make sure there is no active stream
    data.ended = true;
    data.endedAt = Date.now(); // remember when we ended
    data.paused = false;
  } else if (ended === false) {
    // optional: allow explicitly clearing ended state
    data.ended = false;
    data.endedAt = null;
  }

  writeVideoData(data);
  res.json({
    success: true,
    embedUrl: data.embedUrl,
    paused: data.paused,
    ended: data.ended
  });
});

// Pause / resume endpoint used by the admin “Pause for Sunday School” button
app.post("/api/pause", (req, res) => {
  const { paused } = req.body;
  const data = readVideoData();

  data.paused = !!paused;
  // if we’re pausing, it’s definitely not “ended”
  if (data.paused) {
    data.ended = false;
    data.endedAt = null;
  }

  writeVideoData(data);
  res.json({ success: true, paused: data.paused });
});

// Fallback for unknown routes (optional)
app.use((req, res) => {
  res.status(404).send("Not found");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
