const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    // Order information
    orderId: {
      type: String,
      unique: true,
      trim: true,
      default: '',
    },

    design: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Design',
      required: true,
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },

    // Product / design information
    occasion: {
      type: String,
      trim: true,
      default: '',
    },

    hoardingSize: {
      type: String,
      trim: true,
      default: '',
    },

    size: {
      type: String,
      trim: true,
      default: '',
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    material: {
      type: String,
      trim: true,
      default: '',
    },

    materialPrice: {
      type: Number,
      default: 0,
    },

    pricePerSqFt: {
      type: Number,
      default: 0,
    },

    designBasePrice: {
      type: Number,
      default: 0,
    },

    grandTotal: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    customizationNotes: {
      type: String,
      trim: true,
      default: '',
    },

    customizedDesignFile: {
      type: String,
      default: '',
    },

    celebrantName: {
      type: String,
      trim: true,
      default: '',
    },

    slogan: {
      type: String,
      trim: true,
      default: '',
    },

    eventDate: {
      type: String,
      trim: true,
      default: '',
    },

    customerFileUploads: {
      type: [String],
      default: [],
    },

    mainSubjectPhoto: {
      type: String,
      default: '',
    },

    additionalPhotos: {
      type: [String],
      default: [],
    },

    specialChanges: {
      type: String,
      trim: true,
      default: '',
    },

    // Payment information
    paymentMethod: {
      type: String,
      trim: true,
      default: 'COD',
    },

    paymentStatus: {
      type: String,
      trim: true,
      default: 'Pending',
    },

    transactionId: {
      type: String,
      trim: true,
      default: '',
    },

    phonePeOrderId: {
      type: String,
      trim: true,
      default: '',
    },

    phonePeTransactionId: {
      type: String,
      trim: true,
      default: '',
    },

    amountPaid: {
      type: Number,
      default: 0,
    },

    paymentDate: {
      type: String,
      trim: true,
      default: '',
    },

    paymentTime: {
      type: String,
      trim: true,
      default: '',
    },

    // User and delivery information
    name: {
      type: String,
      trim: true,
      default: '',
    },

    email: {
      type: String,
      trim: true,
      default: '',
    },

    phone: {
      type: String,
      trim: true,
      default: '',
    },

    address: {
      type: String,
      trim: true,
      default: '',
    },

    deliveryMode: {
      type: String,
      trim: true,
      default: 'studio-pickup',
    },

    deliveryAddress: {
      type: String,
      trim: true,
      default: '',
    },

    functionHallAddress: {
      type: String,
      trim: true,
      default: '',
    },

    // Order production / approval flow
    finalDesignFile: {
      type: String,
      default: '',
    },

    finalDesignApproved: {
      type: Boolean,
      default: false,
    },

    finalDesignApprovedAt: {
      type: Date,
    },

    customerFeedback: {
      type: String,
      trim: true,
      default: '',
    },

    status: {
      type: String,
      enum: [
        'pending',
        'confirmed',
        'in-progress',
        'awaiting-approval',
        'approved',
        'ready',
        'delivered',
        'cancelled',
      ],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

// Order listing/filtering
orderSchema.index({
  status: 1,
  createdAt: -1,
});

module.exports = mongoose.model('Order', orderSchema);