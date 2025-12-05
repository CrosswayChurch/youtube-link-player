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
      endedAt: typeof parsed.endedAt === "number" ? parsed.endedAt : null,
      technicalIssue: !!parsed.technicalIssue   // <-- NEW FLAG, default false
    };
  } catch (err) {
    console.error("Error reading video.json:", err);
    // default state
    return {
      embedUrl: "",
      paused: false,
      ended: false,
      endedAt: null,
      technicalIssue: false
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
        endedAt: data.endedAt || null,
        technicalIssue: !!data.technicalIssue   // <-- save flag
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
    ended,
    technicalIssue: !!data.technicalIssue   // <-- just exposed, doesn’t change old behavior
  });
});

// POST new video URL / update ended flag
// - Start Stream:  { embedUrl: "<youtube-embed-url>" }
// - End Stream:    { embedUrl: "", ended: true }
// - Tech Issues:   { embedUrl: "<url>", technicalIssue: true }
app.post("/api/video", (req, res) => {
  const { embedUrl, ended, technicalIssue } = req.body;
  const data = readVideoData();

  if (typeof embedUrl === "string") {
    data.embedUrl = embedUrl;

    // If we’re starting or changing a stream, clear ended + paused
    if (embedUrl.trim() !== "") {
      data.ended = false;
      data.endedAt = null;
      data.paused = false;
      // if caller included a technicalIssue flag, use it; otherwise default false
      if (typeof technicalIssue === "boolean") {
        data.technicalIssue = technicalIssue;
      } else {
        data.technicalIssue = false;
      }
    }
  }

  // When admin clicks “End Stream”
  if (ended === true) {
    data.embedUrl = "";        // make sure there is no active stream
    data.ended = true;
    data.endedAt = Date.now(); // remember when we ended
    data.paused = false;
    data.technicalIssue = false; // no tech overlay once we’ve fully ended
  } else if (ended === false) {
    // optional: allow explicitly clearing ended state
    data.ended = false;
    data.endedAt = null;
  }

  // Allow turning tech overlay on/off without changing anything else
  if (typeof technicalIssue === "boolean" && !data.ended && data.embedUrl) {
    data.technicalIssue = technicalIssue;
  }

  writeVideoData(data);
  res.json({
    success: true,
    embedUrl: data.embedUrl,
    paused: data.paused,
    ended: data.ended,
    technicalIssue: data.technicalIssue
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
    data.technicalIssue = false; // pausing overrides tech overlay
  }

  writeVideoData(data);
  res.json({ success: true, paused: data.paused });
});

// Fallback for unknown routes (optional)
app.use((req, res) => {
  res.status(404).send("Not found");
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
