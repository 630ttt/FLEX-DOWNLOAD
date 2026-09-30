const mongoose = require('mongoose');
const { GridFSBucket, ObjectId } = require('mongodb');
const fs = require('fs');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

function getBucket() {
  if (!mongoose.connection || !mongoose.connection.db) {
    throw new Error('MongoDB connection is not ready');
  }

  return new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
}

async function saveUpload(file) {
  if (!file || (!file.buffer && !file.path)) {
    return '';
  }

  const bucket = getBucket();
  const uploadStream = bucket.openUploadStream(file.originalname, {
    contentType: file.mimetype || 'application/octet-stream',
    metadata: {
      originalName: file.originalname,
      mimeType: file.mimetype || 'application/octet-stream',
      size: file.size || file.buffer?.length || 0,
      uploadedAt: new Date().toISOString(),
    },
  });

  const source = file.path
    ? fs.createReadStream(file.path)
    : Readable.from([file.buffer]);
  try {
    await pipeline(source, uploadStream);
  } catch (error) {
    await uploadStream.abort().catch(() => {});
    throw error;
  }

  return `/api/files/${uploadStream.id.toString()}`;
}

async function saveUploads(files = []) {
  return Promise.all(files.map((file) => saveUpload(file)));
}

async function getFileMetadataByIds(ids = []) {
  if (!mongoose.connection || !mongoose.connection.db) {
    throw new Error('MongoDB connection is not ready');
  }

  const fileIds = ids
    .filter((id) => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id))
    .map((id) => new ObjectId(id));
  if (fileIds.length === 0) return [];

  return mongoose.connection.db
    .collection('uploads.files')
    .find({ _id: { $in: fileIds } })
    .project({ filename: 1, contentType: 1, length: 1 })
    .toArray();
}

async function readFileByUrl(fileUrl, maxBytes = 30 * 1024 * 1024) {
  if (typeof fileUrl !== 'string') throw new Error('Invalid design image reference');
  let pathname;
  try {
    pathname = new URL(fileUrl, 'http://localhost').pathname;
  } catch {
    throw new Error('Invalid design image reference');
  }
  const match = pathname.match(/^\/api\/files\/([a-f\d]{24})$/i);
  if (!match) throw new Error('Design image must be stored in the application file store');

  const bucket = getBucket();
  const fileId = new ObjectId(match[1]);
  const metadata = await bucket.find({ _id: fileId }).next();
  if (!metadata) throw new Error('Design image file was not found');
  if (metadata.length > maxBytes) throw new Error('Design image exceeds the processing size limit');

  const buffer = Buffer.allocUnsafe(metadata.length);
  let totalBytes = 0;
  await new Promise((resolve, reject) => {
    const stream = bucket.openDownloadStream(fileId);
    stream.on('data', (chunk) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        stream.destroy(new Error('Design image exceeds the processing size limit'));
        return;
      }
      if (totalBytes > buffer.length) {
        stream.destroy(new Error('Stored file length changed during download'));
        return;
      }
      chunk.copy(buffer, totalBytes - chunk.length);
    });
    stream.on('error', reject);
    stream.on('end', () => totalBytes === metadata.length
      ? resolve()
      : reject(new Error('Stored file ended before its recorded length')));
  });

  return {
    buffer,
    mimeType: metadata.contentType || 'application/octet-stream',
    filename: metadata.filename,
    fileId: fileId.toString(),
  };
}

async function deleteFileByUrl(fileUrl) {
  if (typeof fileUrl !== 'string') return;
  const match = new URL(fileUrl, 'http://localhost').pathname.match(/^\/api\/files\/([a-f\d]{24})$/i);
  if (!match) return;
  await getBucket().delete(new ObjectId(match[1]));
}

async function streamFileFromGridFs(req, res) {
  try {
    if (!mongoose.connection || !mongoose.connection.db) {
      return res.status(503).json({ success: false, message: 'MongoDB connection is not ready' });
    }

    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid file id' });
    }

    const fileId = new ObjectId(req.params.id);
    const bucket = getBucket();

    const file = await bucket.find({ _id: fileId }).next();
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    res.setHeader('Content-Type', file.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);

    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.on('error', () => {
      if (!res.headersSent) {
        res.status(404).json({ success: false, message: 'File not found' });
      }
    });

    downloadStream.pipe(res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { saveUpload, saveUploads, getFileMetadataByIds, readFileByUrl, deleteFileByUrl, streamFileFromGridFs };
