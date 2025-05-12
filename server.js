
console.log("✅ Running the real server.js file");
const express = require('express');
const ffmpeg = require('fluent-ffmpeg');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

const CLIP_FOLDER = path.join(__dirname, 'clips');
if (!fs.existsSync(CLIP_FOLDER)) {
  fs.mkdirSync(CLIP_FOLDER);
  console.log('✅ Created clips folder');
}

app.post('/api/export', async (req, res) => {
  const { filePath, startTime, endTime, userId } = req.body;
  if (!filePath || startTime == null || endTime == null) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const signedUrl = `https://fusaddwffhewdczkaftl.supabase.co/storage/v1/object/public/${filePath}`;
  const tempInputPath = path.join(__dirname, `temp-${uuidv4()}.mp4`);
  const tempOutputPath = path.join(CLIP_FOLDER, `clip-${uuidv4()}.mp4`);

  try {
    const response = await axios({ method: 'GET', url: signedUrl, responseType: 'stream' });
    const writer = fs.createWriteStream(tempInputPath);
    response.data.pipe(writer);

    await new Promise((res, rej) => {
      writer.on('finish', res);
      writer.on('error', rej);
    });

    ffmpeg(tempInputPath)
      .setStartTime(startTime)
      .setDuration(endTime - startTime)
      .output(tempOutputPath)
      .on('end', () => {
        console.log(`✅ Clip created: ${tempOutputPath}`);
        fs.unlink(tempInputPath, () => {});
        return res.json({ clipUrl: `/clips/${path.basename(tempOutputPath)}` });
      })
      .on('error', (err) => {
        console.error('❌ FFmpeg error:', err.message);
        return res.status(500).json({ error: 'Clip export failed' });
      })
      .run();
  } catch (err) {
    console.error('❌ Export failed:', err.message);
    res.status(500).json({ error: 'Clip export failed' });
  }
});

app.post('/api/test', (req, res) => {
  res.json({ message: 'ClipWizardPro backend is working!' });
});

app.use('/clips', express.static(CLIP_FOLDER));
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
