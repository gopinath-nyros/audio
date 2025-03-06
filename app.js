const express = require("express");
const bodyParser = require("body-parser");
const youtubedl = require("youtube-dl-exec");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("@ffmpeg-installer/ffmpeg");
const cookiesPath = path.join(__dirname, "cookies.txt"); // Path to your cookies.txt

// Initialize app
const app = express();
const PORT = 3000;

// Middleware to parse JSON body
app.use(bodyParser.json());

// Create downloads folder if not exists
const downloadFolder = path.join(__dirname, "downloads");
if (!fs.existsSync(downloadFolder)) {
  fs.mkdirSync(downloadFolder);
}

// Path to ffmpeg (adjust this if needed)
// const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';  // Use global ffmpeg if available
const ffmpegPath = ffmpeg.path;

// POST /download endpoint
app.post("/download", async (req, res) => {
  const { url } = req.body;

  if (!url || (!url.includes("youtube.com") && !url.includes("youtu.be"))) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  const fileName = `audio-${Date.now()}.mp3`;
  const outputPath = path.join(downloadFolder, fileName);

  try {
    await youtubedl(url, {
      extractAudio: true,
      audioFormat: "mp3",
      output: outputPath,
      ffmpegLocation: ffmpegPath, // This fixes the error!
      quiet: true,
      cookies: cookiesPath,
    });

    return res.json({
      message: "Download complete",
      outputPath,
      filePath: `/downloads/${fileName}`,
    });
  } catch (error) {
    console.error("Download failed:", error);
    return res.status(500).json({ error: "Failed to download audio" });
  }
});

// Serve static files from downloads folder so files can be accessed directly
app.use("/downloads", express.static(downloadFolder));

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`⚙️ Using ffmpeg from: ${ffmpegPath}`);
});
