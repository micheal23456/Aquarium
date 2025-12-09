const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        fishId: { type: mongoose.Schema.Types.ObjectId, ref: 'Fish', required: true },
        name: String,
        photo: String,
        price: Number,
        quantity: Number
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['cod', 'razorpay', 'upi', 'card', 'netbanking'], // ✅ Added Razorpay/UPI
        required: true
    },
    shippingAddress: {
        name: String,
        phone: String,
        address: String,
        city: String,
        state: String,
        pincode: String
    },
    // 🔥 RAZORPAY UPI FIELDS
    razorpayOrderId: {
        type: String,
        default: null
    },
    razorpayPaymentId: {
        type: String,
        default: null
    },
    razorpaySignature: {
        type: String,
        default: null
    },
    paymentStatus: {
        type: String,
        enum: ['created', 'paid', 'failed', 'cancelled'],
        default: 'created'
    },
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    }
});

// Update timestamp on save
orderSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;