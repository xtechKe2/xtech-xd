const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { getRandom } = require('./utils');

const TMP_DIR = path.join(__dirname, '..', 'tmp');
function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

/**
 * Add EXIF metadata to a webp buffer directly (without node-webpmux)
 * @param {Buffer} webpBuffer - The webp image buffer
 * @param {object} metadata - Sticker metadata { packname, author, categories }
 * @returns {Buffer} Webp buffer with EXIF data
 */
function addExifData(webpBuffer, metadata = {}) {
  const { packname = 'XTECH_KE', author = 'XTECH_KE', categories = '' } = metadata;

  const json = {
    'sticker-pack-id': 'XTECH_KE',
    'sticker-pack-name': packname,
    'sticker-pack-publisher': author,
    'emojis': categories ? categories.split(',') : ['🔥'],
    'android-app-store-link': '',
    'ios-app-store-link': ''
  };

  // Build EXIF data
  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
  ]);

  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf-8');
  const exif = Buffer.concat([
    exifAttr,
    jsonBuffer,
    Buffer.from([0x00])
  ]);

  exif.writeUInt8(jsonBuffer.length + 1, 14);

  // Insert EXIF chunk into webp file
  // Webp format: RIFF <size> WEBP <chunks...>
  // We need to insert an EXIF chunk after the VP8/VP8L chunk
  return insertExifChunk(webpBuffer, exif);
}

/**
 * Insert EXIF chunk into webp buffer
 * @param {Buffer} webp - Original webp buffer
 * @param {Buffer} exif - EXIF data to insert
 * @returns {Buffer} Modified webp buffer
 */
function insertExifChunk(webp, exif) {
  // Validate webp signature
  if (webp.length < 12) return webp;
  const riff = webp.toString('ascii', 0, 4);
  if (riff !== 'RIFF') return webp;

  // Find the first chunk offset (after "RIFF<size>WEBP")
  let offset = 12;

  // Find the end of the first chunk (VP8 or VP8L or ANIM)
  // Webp chunks: <4-byte fourcc> <4-byte size> <data...>
  while (offset < webp.length - 8) {
    const chunkFourcc = webp.toString('ascii', offset, offset + 4);
    const chunkSize = webp.readUInt32LE(offset + 4);

    // If we found the VP8 or VP8L chunk, insert EXIF after it
    if (chunkFourcc === 'VP8 ' || chunkFourcc === 'VP8L' || chunkFourcc === 'ANIM') {
      const chunkEnd = offset + 8 + chunkSize + (chunkSize % 2); // chunks are padded to even size

      // Build the EXIF chunk
      const exifFourcc = Buffer.from('EXIF', 'ascii');
      const exifSizeBuf = Buffer.alloc(4);
      exifSizeBuf.writeUInt32LE(exif.length, 0);
      const exifChunk = Buffer.concat([exifFourcc, exifSizeBuf, exif]);
      // Pad to even size if needed
      const exifPadding = exif.length % 2 ? Buffer.alloc(1, 0) : Buffer.alloc(0);
      const fullExifChunk = Buffer.concat([exifChunk, exifPadding]);

      // Reassemble: before + VP8 chunk + EXIF chunk + after
      const before = webp.slice(0, chunkEnd);
      const after = webp.slice(chunkEnd);

      const newWebp = Buffer.concat([before, fullExifChunk, after]);

      // Update RIFF size (at offset 4, 4 bytes LE)
      const newSize = newWebp.length - 8;
      newWebp.writeUInt32LE(newSize, 4);

      return newWebp;
    }

    // Move to next chunk
    offset += 8 + chunkSize + (chunkSize % 2);
  }

  // If no VP8/VP8L chunk found, just append EXIF
  const exifFourcc = Buffer.from('EXIF', 'ascii');
  const exifSizeBuf = Buffer.alloc(4);
  exifSizeBuf.writeUInt32LE(exif.length, 0);
  const exifChunk = Buffer.concat([exifFourcc, exifSizeBuf, exif]);
  const exifPadding = exif.length % 2 ? Buffer.alloc(1, 0) : Buffer.alloc(0);
  const fullExifChunk = Buffer.concat([exifChunk, exifPadding]);

  const newWebp = Buffer.concat([webp.slice(0, webp.length), fullExifChunk]);
  const newSize = newWebp.length - 8;
  newWebp.writeUInt32LE(newSize, 4);

  return newWebp;
}

async function writeExifImg(buffer, metadata = {}) {
  ensureTmpDir();
  const inputPath = path.join(TMP_DIR, `${getRandom('png')}`);
  const outputPath = path.join(TMP_DIR, `${getRandom('webp')}`);
  
  fs.writeFileSync(inputPath, buffer);
  
  try {
    execSync(`ffmpeg -y -i "${inputPath}" -vcodec libwebp -lossless 1 -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=white" -preset default -an -vsync 0 "${outputPath}"`, { timeout: 15000 });
  } catch {
    try {
      execSync(`ffmpeg -y -i "${inputPath}" -vcodec libwebp -lossless 0 -q:v 75 -vf "scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:-1:-1:color=white" -preset default -an -vsync 0 "${outputPath}"`, { timeout: 15000 });
    } catch {
      // If ffmpeg fails completely, just return the original buffer
      try { fs.unlinkSync(inputPath); } catch {}
      return buffer;
    }
  }
  
  const webpBuffer = fs.readFileSync(outputPath);
  
  try {
    const finalBuffer = addExifData(webpBuffer, metadata);
    try { fs.unlinkSync(inputPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}
    return finalBuffer;
  } catch {
    try { fs.unlinkSync(inputPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}
    return webpBuffer;
  }
}

async function writeExifWebp(buffer, metadata = {}) {
  ensureTmpDir();
  
  try {
    const finalBuffer = addExifData(buffer, metadata);
    return finalBuffer;
  } catch {
    return buffer;
  }
}

module.exports = { writeExifImg, writeExifWebp };
