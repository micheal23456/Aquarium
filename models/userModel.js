const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Name is required'], 
        trim: true, 
        maxlength: [100, 'Name too long']
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'], 
        unique: true, 
        lowercase: true, 
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email']
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'], 
        minlength: [6, 'Password too short']
    },
    phone: { 
        type: String, 
        required: [true, 'Phone is required'],
        match: [/^\d{10}$/, 'Phone must be 10 digits']
    },
    address: { 
        type: String, 
        required: [true, 'Address is required'],
        maxlength: [500, 'Address too long']
    },
    role: { 
        type: String, 
        enum: ['user', 'admin'], 
        default: 'user' 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    orders: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Order' 
    }],
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

// ✅ PASSWORD COMPARE - FOR LOGIN
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// ✅ ADD ORDER TO USER - FOR E-COMMERCE
userSchema.methods.addOrder = async function(orderId) {
    this.orders.push(orderId);
    await this.save();
    return this;
};

// ✅ GET USER ORDERS - POPULATED
userSchema.methods.getOrders = async function() {
    return await mongoose.model('Order').find({ userId: this._id })
        .populate('items.fishId', 'name photo price')
        .sort({ createdAt: -1 })
        .lean();
};

const User = mongoose.model('User', userSchema);
module.exports = User;
