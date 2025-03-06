const express = require("express");
const bodyParser = require("body-parser");
const youtubedl = require("youtube-dl-exec");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("@ffmpeg-installer/ffmpeg");
const puppeteer = require("puppeteer");
const moment = require("moment");

// Initialize app
const app = express();
const PORT = 3000;

// Path configurations
const cookiesPath = path.join(__dirname, "cookies.txt"); // Path to your cookies.txt
const downloadFolder = path.join(__dirname, "downloads");

// Middleware to parse JSON body
app.use(bodyParser.json());

// Create downloads folder if not exists
if (!fs.existsSync(downloadFolder)) {
  fs.mkdirSync(downloadFolder);
}

// Path to ffmpeg
const ffmpegPath = ffmpeg.path;

// Function to check if cookies are expired
// async function areCookiesExpired() {
//   try {
//     // Check if the cookies file exists
//     if (!fs.existsSync(cookiesPath)) {
//       console.log("Cookies file does not exist");
//       return true;
//     }

//     // Check when the cookies file was last modified
//     const stats = fs.statSync(cookiesPath);
//     const lastModified = moment(stats.mtime);
//     const now = moment();

//     // If cookies are older than 24 hours, consider them expired
//     // Adjust this threshold based on how often your cookies expire
//     const hoursDiff = now.diff(lastModified, 'hours');
//     console.log(`Cookies are ${hoursDiff} hours old`);
//     return hoursDiff > 24;
//   } catch (error) {
//     console.error("Error checking cookie expiration:", error);
//     return true; // Assume expired if there's an error
//   }
// }
async function areCookiesExpired() {
  try {
    // Check if the cookies file exists
    if (!fs.existsSync(cookiesPath)) {
      console.log("Cookies file does not exist");
      return true;
    }

    // Check when the cookies file was last modified
    const stats = fs.statSync(cookiesPath);
    const lastModified = moment(stats.mtime);
    const now = moment();

    // If cookies are older than 10 minutes, consider them expired
    const minutesDiff = now.diff(lastModified, "minutes");
    console.log(`Cookies are ${minutesDiff} minutes old`);
    return minutesDiff > 1;
  } catch (error) {
    console.error("Error checking cookie expiration:", error);
    return true; // Assume expired if there's an error
  }
}

// Function to refresh cookies using Puppeteer
// async function refreshCookies() {
//   console.log("Refreshing YouTube cookies...");
//   const browser = await puppeteer.launch({
//     headless: "new"
//   });
//   const page = await browser.newPage();

//   try {
//     // Navigate to YouTube
//     await page.goto('https://www.youtube.com/', {
//       waitUntil: 'networkidle2'
//     });

//     // Add your login logic here if needed
//     await page.click('button#signin');
//     await page.waitForSelector('input#identifierId');
//     await page.type('input#identifierId', 'test@gmail.com');
//     await page.click('#identifierNext');
//     await page.waitForSelector('input[type="password"]', { visible: true });
//     await page.type('input[type="password"]', '12345');
//     await page.click('#passwordNext');
//     await page.waitForNavigation({ waitUntil: 'networkidle2' });

//     // Get the cookies
//     const cookies = await page.cookies();

//     // Format cookies for youtube-dl
//     const formattedCookies = cookies.map(cookie => {
//       return `${cookie.domain}\tTRUE\t${cookie.path}\t${cookie.secure ? 'TRUE' : 'FALSE'}\t${Math.floor(cookie.expires || Date.now()/1000 + 86400)}\t${cookie.name}\t${cookie.value}`;
//     }).join('\n');

//     console.log("NEW COOKIES...");

//     console.log(formattedCookies);

//     // Write cookies to file
//     fs.writeFileSync(cookiesPath, formattedCookies);

//     console.log('Cookies refreshed successfully');
//   } catch (error) {
//     console.error('Error refreshing cookies:', error);
//     throw error;
//   } finally {
//     await browser.close();
//   }
// }
// Function to refresh cookies using Puppeteer
// async function refreshCookies() {
//     console.log("Refreshing YouTube cookies...");
//     const browser = await puppeteer.launch({
//       headless: "new"
//     });
//     const page = await browser.newPage();

//     try {
//       // Navigate to YouTube
//       await page.goto('https://www.youtube.com/', {
//         waitUntil: 'networkidle2'
//       });

//       // Find and click the sign-in button (current as of 2025)
//       // First try finding it by aria-label
//       const signInButton = await page.$('a[aria-label="Sign in"]');
//       if (signInButton) {
//         await signInButton.click();
//       } else {
//         // Try alternative selectors if the first one doesn't work
//         const altSignInButton = await page.$('ytd-button-renderer a[href*="signin"]');
//         if (altSignInButton) {
//           await altSignInButton.click();
//         } else {
//           console.log("Could not find sign-in button, but continuing to get cookies anyway");
//           // Even without logging in, we can still get some cookies
//         }
//       }

//       // If we found a sign-in button, wait for navigation and try to log in
//       if (signInButton || altSignInButton) {
//         await page.waitForNavigation({ waitUntil: 'networkidle2' });

//         // Wait for email input field to appear and type email
//         await page.waitForSelector('input[type="email"]', { visible: true, timeout: 5000 }).catch(() => {
//           console.log("Email input field not found, skipping login");
//         });

//         if (await page.$('input[type="email"]')) {
//           await page.type('input[type="email"]', 'test@gmail.com');

//           // Find and click the Next button
//           const nextButton = await page.$('button[jsname="LgbsSe"]') || await page.$('#identifierNext');
//           if (nextButton) {
//             await nextButton.click();

//             // Wait for password field to appear
//             await page.waitForSelector('input[type="password"]', { visible: true, timeout: 5000 }).catch(() => {
//               console.log("Password input field not found, skipping rest of login");
//             });

//             if (await page.$('input[type="password"]')) {
//               await page.type('input[type="password"]', '12345');

//               // Find and click the password next button
//               const passwordNext = await page.$('button[jsname="LgbsSe"]') || await page.$('#passwordNext');
//               if (passwordNext) {
//                 await passwordNext.click();
//                 await page.waitForNavigation({ waitUntil: 'networkidle2' });
//               }
//             }
//           }
//         }
//       }

//       // Wait a moment for any redirects to complete
//       await page.waitForTimeout(2000);

//       // Get the cookies
//       const cookies = await page.cookies();

//       // Format cookies for youtube-dl
//       const formattedCookies = cookies.map(cookie => {
//         return `${cookie.domain}\tTRUE\t${cookie.path}\t${cookie.secure ? 'TRUE' : 'FALSE'}\t${Math.floor(cookie.expires || Date.now()/1000 + 86400)}\t${cookie.name}\t${cookie.value}`;
//       }).join('\n');

//       // Write cookies to file
//       fs.writeFileSync(cookiesPath, formattedCookies);

//       console.log('Cookies refreshed successfully');
//     } catch (error) {
//       console.error('Error refreshing cookies:', error);
//       throw error;
//     } finally {
//       await browser.close();
//     }
//   }

// async function refreshCookies() {
//     console.log("Refreshing YouTube cookies...");
//     const browser = await puppeteer.launch({
//       headless: "new"
//     });
//     const page = await browser.newPage();

//     try {
//       // Navigate to YouTube
//       await page.goto('https://www.youtube.com/', {
//         waitUntil: 'networkidle2'
//       });

//       // Instead of trying to log in (which seems problematic),
//       // just browse YouTube a bit to get cookies
//       await page.goto('https://www.youtube.com/feed/trending', {
//         waitUntil: 'networkidle2'
//       });

//       // Use setTimeout instead of waitForTimeout
//       await new Promise(resolve => setTimeout(resolve, 2000));

//       // Get the cookies
//       const cookies = await page.cookies();

//       // Format cookies for youtube-dl
//       const formattedCookies = cookies.map(cookie => {
//         return `${cookie.domain}\tTRUE\t${cookie.path}\t${cookie.secure ? 'TRUE' : 'FALSE'}\t${Math.floor(cookie.expires || Date.now()/1000 + 86400)}\t${cookie.name}\t${cookie.value}`;
//       }).join('\n');

//       console.log(formattedCookies);

//       // Write cookies to file
//       fs.writeFileSync(cookiesPath, formattedCookies);

//       console.log('Cookies refreshed successfully');
//     } catch (error) {
//       console.error('Error refreshing cookies:', error);
//       throw error;
//     } finally {
//       await browser.close();
//     }
//   }

// POST /download endpoint
app.post("/download", async (req, res) => {
  const { url } = req.body;

  if (!url || (!url.includes("youtube.com") && !url.includes("youtu.be"))) {
    return res.status(400).json({ error: "Invalid YouTube URL" });
  }

  try {
   
    const fileName = `audio-${Date.now()}.mp3`;
    const outputPath = path.join(downloadFolder, fileName);

    await youtubedl(url, {
      extractAudio: true,
      audioFormat: "mp3",
      output: outputPath,
      ffmpegLocation: ffmpegPath,
      quiet: true,
      //   cookiesFromBrowser: "chrome",
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
