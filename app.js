const express = require('express');
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Middleware to parse JSON body
app.use(express.json());

// Endpoint to download YouTube video and convert to audio
app.get('/download', async (req, res) => {
  try {
    const {url} = req.body;
        console.log(url);
        
    // Validate YouTube URL
    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    console.log("PASS");
    
    // Get video info to create a good filename
    const options = {
      requestOptions: {
        headers: {
          // Add a user agent to mimic a regular browser request
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          // Adding cookies might help avoid the bot detection
          'Cookie': 'CONSENT=YES+; Path=/',
        }
      }
    };
    
    const info = await ytdl.getInfo(url, options);
    const videoTitle = info.videoDetails.title.replace(/[^\w\s]/gi, ''); // Remove special chars
    
    // Create a unique filename
    const timestamp = Date.now();
    const filename = `${videoTitle}-${timestamp}.mp3`;
    const filePath = path.join(uploadsDir, filename);
    
    // Download and convert to audio with the same headers
    ytdl(url, {
      quality: 'highestaudio',
      filter: 'audioonly',
      requestOptions: options.requestOptions
    })
      .pipe(fs.createWriteStream(filePath))
      .on('finish', () => {
        const relativePath = `/uploads/${filename}`;
        res.json({ 
          success: true, 
          message: 'Audio downloaded successfully',
          filename: filename,
          path: relativePath,
          fullPath: filePath
        });
      })
      .on('error', (error) => {
        console.error('Error during download:', error);
        res.status(500).json({ error: 'Failed to download and convert video' });
      });
      
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).send('Server is running!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
