const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
// Add this line to import ffmpeg-static
const ffmpegPath = require('ffmpeg-static');

// Set the ffmpeg path explicitly
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = process.env.PORT || 3000;

// For parsing JSON bodies
app.use(express.json());
// For parsing URL encoded bodies
app.use(express.urlencoded({ extended: true }));

// Create downloads directory if it doesn't exist
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir);
}

app.post('/download', async (req, res) => {
  try {
    const { url, format = 'mp3' } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }
    
    // Validate YouTube URL
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    
    // Get video info
    const info = await ytdl.getInfo(url);
    const videoTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '_');
    const outputPath = path.join(downloadsDir, `${videoTitle}.${format}`);
    
    // Download audio only
    const audioStream = ytdl(url, {
      quality: 'highestaudio',
      filter: 'audioonly'
    });
    
    // Convert to desired format using ffmpeg
    ffmpeg(audioStream)
      .audioBitrate(128)
      .format(format)
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        return res.status(500).json({ error: 'Conversion failed' });
      })
      .on('end', () => {
        return res.json({
          success: true,
          message: 'Audio downloaded successfully',
          filename: `${videoTitle}.${format}`,
          path: outputPath
        });
      })
      .save(outputPath);
      
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to download audio' });
  }
});

// Optional: Endpoint to serve downloaded files
app.get('/downloads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(downloadsDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: 'File not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});