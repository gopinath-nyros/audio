const express = require("express");
const { audiolink } = require("./audio.js");
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const uploadsDir = path.join(__dirname, 'hello');


// Middleware to parse JSON request bodies
app.use(express.json());

app.post("/download", audiolink);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/downloads", async (req, res) => {
  try {
    // const youtubeUrl = req.query.url;
    const { url } = req.body;
    // Validate YouTube URL
    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    // Get video info to create a good filename
    const info = await ytdl.getInfo(url);
    const videoTitle = info.videoDetails.title.replace(/[^\w\s]/gi, ""); // Remove special chars

    // Create a unique filename
    const timestamp = Date.now();
    const filename = `${videoTitle}-${timestamp}.mp3`;
    const filePath = path.join(uploadsDir, filename);

    // Download and convert to audio
    ytdl(url, {
      quality: "highestaudio",
      filter: "audioonly",
    })
      .pipe(fs.createWriteStream(filePath))
      .on("finish", () => {
        const relativePath = `/uploads/${filename}`;
        res.json({
          success: true,
          message: "Audio downloaded successfully",
          filename: filename,
          path: relativePath,
          fullPath: filePath,
        });
      })
      .on("error", (error) => {
        console.error("Error during download:", error);
        res.status(500).json({ error: "Failed to download and convert video" });
      });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
