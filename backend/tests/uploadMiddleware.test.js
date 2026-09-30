const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { once } = require('events');
const express = require('express');
const upload = require('../middleware/uploadMiddleware');

test('disk-spooled upload accepts a file over 100 MB without an in-memory buffer', async (context) => {
  const app = express();
  const diskUpload = upload.withDiskStorage();
  let savedPath = '';
  app.post('/upload', diskUpload.single('designFile'), (req, res) => {
    savedPath = req.file.path;
    res.json({ size: req.file.size, hasBuffer: Boolean(req.file.buffer), path: req.file.path });
  });

  const server = app.listen(0, '127.0.0.1');
  context.after(async () => {
    if (savedPath) await fs.promises.rm(savedPath, { force: true });
    await new Promise((resolve) => server.close(resolve));
  });
  await new Promise((resolve) => server.once('listening', resolve));

  const temporaryDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'large-upload-test-'));
  const sourcePath = path.join(temporaryDir, 'large.psd');
  const source = fs.createWriteStream(sourcePath);
  const chunk = Buffer.alloc(1024 * 1024, 0x41);
  for (let index = 0; index < 101; index += 1) {
    if (!source.write(chunk)) await once(source, 'drain');
  }
  await new Promise((resolve, reject) => {
    source.once('error', reject);
    source.end(resolve);
  });

  const form = new FormData();
  form.append('designFile', await fs.openAsBlob(sourcePath), 'large.psd');
  const response = await fetch(`http://127.0.0.1:${server.address().port}/upload`, {
    method: 'POST',
    body: form,
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.size, 101 * 1024 * 1024);
  assert.equal(result.hasBuffer, false);
  assert.ok(fs.existsSync(result.path));
  await fs.promises.rm(temporaryDir, { recursive: true, force: true });
});