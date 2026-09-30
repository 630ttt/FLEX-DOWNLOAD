const { isPsd } = require('../services/designAssets');

const rejectPsdCustomerUploads = (req, res, next) => {
  if ((req.files || []).some((file) => isPsd(file) || file.buffer?.toString('ascii', 0, 4) === '8BPS')) {
    return res.status(400).json({
      success: false,
      message: 'PSD uploads are restricted to administrator design management.',
    });
  }
  return next();
};

module.exports = rejectPsdCustomerUploads;