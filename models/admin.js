const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        default: 'Admin User'
    },
    email: {
        type: String,
        required: [true, 'Email required'],
        unique: true,
        lowercase: true
    },
    password: {
        type: String,
        required: [true, 'Password required']
    }
});

// ✅ ADD THESE METHODS
adminSchema.methods.setPassword = async function(password) {
    this.password = await bcrypt.hash(password, 12);
};

adminSchema.methods.validatePassword = async function(candidatePassword) {
    if (!this.password) {
        console.log('❌ Admin has no password!');
        return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
};

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;