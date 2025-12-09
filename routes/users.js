var express = require('express');
var router = express.Router();
const User = require('../models/userModel');
const Fish = require('../models/fish');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Order = require('../models/Order');

// MIDDLEWARE - API ROUTES (No session, JWT tokens)
const JWT_SECRET = 'your-super-secret-jwt-key-change-in-production';

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// Verify JWT token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token' });
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });
        req.userId = decoded.userId;
        next();
    });
};

// GET /api/fishes - All fishes for users
router.get('/fishes', async (req, res) => {
    try {
        const fishes = await Fish.find()
            .sort({ timestamp: -1 })
            .lean();
        res.json(fishes);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /api/register - ✅ FIXED: Returns ALL fields
router.post('/register', async (req, res) => {
    try {
        console.log('📝 REGISTER DATA:', req.body);
        
        const { name, email, password, phone, address } = req.body;
        
        // MANUAL HASHING - NO pre('save') hook needed
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create user with ALREADY HASHED password
        const user = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,  // ✅ ALREADY HASHED
            phone: phone.trim(),
            address: address.trim()
        });
        
        console.log('🆕 SAVING USER:', user);
        
        await user.save();
        
        const token = generateToken(user._id);
        res.json({ 
            message: 'User created successfully',
            token,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email,
                phone: user.phone,
                address: user.address 
            }
        });
    } catch (error) {
        console.error('❌ REGISTER ERROR:', error);
        res.status(400).json({ error: error.message });
    }
});

// POST /api/login - ✅ FIXED: Returns ALL fields
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken(user._id);
        res.json({
            message: 'Login successful',
            token,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email,
                phone: user.phone,
                address: user.address 
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /api/profile - User profile (protected)
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('-password').lean();
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /orders - Save order (NO payment verification for now)
router.post('/orders', verifyToken, async (req, res) => {
    try {
        const { items, totalAmount, paymentMethod, shippingAddress, orderNumber } = req.body;
        
        const order = new Order({
            userId: req.userId,
            items,
            totalAmount,
            paymentMethod: paymentMethod || 'cod',
            shippingAddress: shippingAddress || {},
            status: 'pending',
            orderNumber: orderNumber || `AQU-${Date.now().toString().slice(-6)}`
        });
        
        await order.save();
        
        console.log('✅ ORDER SAVED:', order._id);
        res.json({ 
            message: 'Order placed successfully!',
            orderId: order._id,
            orderNumber: order.orderNumber
        });
    } catch (error) {
        console.error('❌ ORDER ERROR:', error);
        res.status(400).json({ error: error.message });
    }
});

// GET /api/orders - User orders
router.get('/orders', verifyToken, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.userId })
            .populate('items.fishId')
            .sort({ createdAt: -1 })
            .lean();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
