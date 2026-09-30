const localAiServer = require('../../localAiServer');

module.exports = {
  async inpaint({ imageBuffer, mimeType, prompt, replacementImage, maskBuffer }) {
    const result = await localAiServer.editImage({
      imageBuffer,
      mimeType,
      prompt,
      steps: 4,
      referenceImage: replacementImage ? { buffer: replacementImage, mimetype: 'image/png' } : null,
      maskBuffer,
    });
    return { imageBuffer: result.imageBuffer };
  },
};