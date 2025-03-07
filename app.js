const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');

// Set the ffmpeg path explicitly
ffmpeg.setFfmpegPath(ffmpegPath);

// Set YTDL_NO_UPDATE environment variable to disable update checks
process.env.YTDL_NO_UPDATE = 1;

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

// Simple rate limiting mechanism
const requestTimestamps = {};
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
const MAX_REQUESTS_PER_WINDOW = 5; // Maximum requests per minute

// Check if a request should be rate limited
function isRateLimited(ip) {
  const now = Date.now();
  if (!requestTimestamps[ip]) {
    requestTimestamps[ip] = [];
  }
  
  // Remove timestamps older than the window
  requestTimestamps[ip] = requestTimestamps[ip].filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW
  );
  
  // Check if we're over the limit
  if (requestTimestamps[ip].length >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }
  
  // Add the current timestamp
  requestTimestamps[ip].push(now);
  return false;
}

// Clean up rate limit data every hour
setInterval(() => {
  const now = Date.now();
  Object.keys(requestTimestamps).forEach(ip => {
    if (requestTimestamps[ip].length === 0 || 
        now - Math.max(...requestTimestamps[ip]) > RATE_LIMIT_WINDOW) {
      delete requestTimestamps[ip];
    }
  });
}, 60 * 60 * 1000);

// Function to handle YouTube requests with retries
async function getYoutubeInfo(url) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 2000; // 2 seconds
  
  let lastError;
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await ytdl.getInfo(url);
    } catch (error) {
      lastError = error;
      if (error.statusCode === 429) {
        console.log(`Rate limited (attempt ${attempt + 1}/${MAX_RETRIES}), waiting ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
      } else {
        throw error; // If it's not a rate limit error, rethrow immediately
      }
    }
  }
  
  throw lastError; // If we've exhausted retries, throw the last error
}

app.post('/download', async (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    if (isRateLimited(clientIp)) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again later.',
        retryAfter: RATE_LIMIT_WINDOW / 1000
      });
    }
    
    const { url, format = 'mp3' } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }
    
    // Validate YouTube URL
    if (!ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    
    // Get video info with retries
    const info = await getYoutubeInfo(url);
    const videoTitle = info.videoDetails.title.replace(/[^\w\s]/gi, '_');
    const outputPath = path.join(downloadsDir, `${videoTitle}.${format}`);
    
    // Check if file already exists to avoid unnecessary downloads
    if (fs.existsSync(outputPath)) {
      return res.json({
        success: true,
        message: 'Audio already exists',
        filename: `${videoTitle}.${format}`,
        path: outputPath
      });
    }
    
    // Download audio only with increased timeout
    const audioStream = ytdl(url, {
      quality: 'highestaudio',
      filter: 'audioonly',
      requestOptions: {
        timeout: 30000 // 30 seconds timeout
      }
    });
    
    // Handle stream errors
    audioStream.on('error', (err) => {
      console.error('Audio stream error:', err);
      return res.status(500).json({ error: 'Download failed', details: err.message });
    });
    
    // Convert to desired format using ffmpeg
    ffmpeg(audioStream)
      .audioBitrate(128)
      .format(format)
      .on('error', (err) => {
        console.error('FFmpeg error:', err);
        return res.status(500).json({ error: 'Conversion failed', details: err.message });
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
    res.status(500).json({ 
      error: 'Failed to download audio',
      details: error.message,
      statusCode: error.statusCode
    });
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