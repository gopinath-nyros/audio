const fs = require("fs");
const path = require("path");
const ytdl = require("ytdl-core");

const audiolink = async (req, res) => {
  try {
    const { url } = req.body; // YT URL from request body

    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    // Get video info to extract title and formats
    const videoId = ytdl.getURLVideoID(url);
    const info = await ytdl.getInfo(videoId);

    const videoTitle = info.videoDetails.title.replace(/[<>:"/\\|?*]+/g, ""); // sanitize filename

    // Select audio-only format automatically
    const audioFormat = ytdl.filterFormats(info.formats, "audioonly")[0]; // pick the first audio format

    if (!audioFormat) {
      return res.status(500).json({ error: "No audio format available" });
    }

    // Set save location
    const uploadDir = path.join(__dirname, "uploads", "media"); // You can change this
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, `${videoTitle}.mp3`);

    // Start downloading and saving
    const audioStream = ytdl(url, {
      filter: (format) => format.itag === audioFormat.itag,
    });

    const fileStream = fs.createWriteStream(filePath);
    audioStream.pipe(fileStream);

    fileStream.on("finish", () => {
      res.json({
        message: "Audio file downloaded successfully",
        path: filePath,
        filename: `${videoTitle}.mp3`,
      });
    });

    fileStream.on("error", (err) => {
      res.status(500).json({ error: `File write error: ${err.message}` });
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { audiolink };
