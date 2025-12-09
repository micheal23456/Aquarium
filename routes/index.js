var express = require('express');
var router = express.Router();
const Admin = require('../models/admin');
const User = require('../models/userModel');
const Fish = require('../models/fish');
const Order = require('../models/Order'); // ✅ ADDED MISSING IMPORT
const multer = require('multer');
const path = require('path');

// Multer storage for routes
const storage = multer.diskStorage({
    destination: 'public/uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 1000 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images and videos allowed!'), false);
        }
    }
});

function isAuthenticated(req, res, next) {
    if (req.session && req.session.isAdminLoggedIn) {
        return next();
    } else {
        res.redirect('/');
    }
}

// Login
router.get('/', (req, res) => {
    res.render('login', { error: null });
});

router.post('/', async (req, res) => {
    const { email, password } = req.body;
    try {
        const admin = await Admin.findOne({ email });
        if (admin && await admin.validatePassword(password)) {
            req.session.isAdminLoggedIn = true;
            res.redirect('/home');
        } else {
            res.render('login', { error: 'Invalid email or password' });
        }
    } catch (err) {
        console.error(err);
        res.render('login', { error: 'An error occurred' });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.redirect('/home');
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
});

// Home Dashboard - ✅ FIXED WITH ORDERS COUNT
router.get('/home', isAuthenticated, async (req, res) => {
    try {
        const search = req.query.search || '';
        const filter = search ? { name: { $regex: search, $options: 'i' } } : {};
        const fishes = await Fish.find(filter).sort({ timestamp: -1 }).limit(20).lean();
        
        // ✅ FETCH PENDING ORDERS COUNT
        const ordersCount = await Order.countDocuments({ status: 'pending' });
        
        res.render('fish/home', { 
            fishes, 
            search,
            ordersCount  // ✅ NOW PASSED TO TEMPLATE
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// CREATE FISH - FILE UPLOAD
router.get('/create_fish', isAuthenticated, (req, res) => {
    res.render('fish/create', { error: null });
});

router.post('/create_fish', isAuthenticated, upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]), async (req, res) => {  // ✅ MADE ASYNC
    try {
        const { name, price, type } = req.body;
        const photo = req.files['photo'] ? `/uploads/${req.files['photo'][0].filename}` : '';
        const video = req.files['video'] ? `/uploads/${req.files['video'][0].filename}` : '';

        const fish = new Fish({ name, photo, video, price: parseFloat(price), type });
        
        const validationError = fish.validateSync();
        if (validationError) {
            res.render('fish/create', { error: validationError.errors });
        } else {
            await fish.save();  // ✅ AWAITED
            res.redirect('/home');
        }
    } catch (error) {
        console.error(error);
        res.render('fish/create', { error: { message: error.message } });
    }
});

// RETRIEVE
router.get('/retrieve_fish', isAuthenticated, async (req, res) => {  // ✅ ASYNC/AWAIT
    try {
        const data = await Fish.find().sort({ timestamp: -1 }).lean();
        res.render('fish/retrieve', { data });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// UPDATE FISH
router.get('/update_fish/:id', isAuthenticated, async (req, res) => {  // ✅ ASYNC/AWAIT
    try {
        const fish = await Fish.findById(req.params.id).lean();
        if (!fish) return res.status(404).send('Fish not found');
        res.render('fish/update', { fish, error: null });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.post('/update_fish/:id', isAuthenticated, upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]), async (req, res) => {  // ✅ ASYNC/AWAIT
    try {
        const fishId = req.params.id;
        const { name, price, type } = req.body;
        const updateData = { name, price: parseFloat(price), type };
        
        if (req.files['photo']) updateData.photo = `/uploads/${req.files['photo'][0].filename}`;
        if (req.files['video']) updateData.video = `/uploads/${req.files['video'][0].filename}`;
        
        await Fish.findByIdAndUpdate(fishId, updateData);  // ✅ AWAITED
        res.redirect('/home');
    } catch (error) {
        console.error(error);
        try {
            const fish = await Fish.findById(req.params.id).lean();
            res.render('fish/update', { fish, error: { message: error.message } });
        } catch (fetchErr) {
            res.status(500).send('Server error');
        }
    }
});

// DELETE FISH
router.get('/delete_fish/:id', isAuthenticated, async (req, res) => {  // ✅ ASYNC/AWAIT
    try {
        const fish = await Fish.findById(req.params.id);
        if (!fish) return res.status(404).send('Fish not found');
        res.render('fish/delete', { fish });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.post('/delete_fish/:id', isAuthenticated, async (req, res) => {  // ✅ ASYNC/AWAIT
    try {
        await Fish.findByIdAndDelete(req.params.id);
        res.redirect('/home');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/userlist', isAuthenticated, async (req, res) => {
    try {
        const perPage = 10;
        const page = parseInt(req.query.page) || 1;
        const search = req.query.search || '';
        const filter = search ? { name: { $regex: search, $options: 'i' } } : {};
        
        const totalUsers = await User.countDocuments(filter);
        const totalPages = Math.ceil(totalUsers / perPage);
        
        const users = await User.find(filter)
            .skip((page - 1) * perPage)
            .limit(perPage)
            .lean();

        res.render('userlist', {
            users,
            currentPage: page,
            totalPages,
            totalUsers,
            search
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

router.get('/user/block/:id', isAuthenticated, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { isActive: false });
    } catch (err) {
        console.error(err);
    }
    res.redirect('/userlist');
});

router.get('/user/unblock/:id', isAuthenticated, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.params.id, { isActive: true });
    } catch (err) {
        console.error(err);
    }
    res.redirect('/userlist');
});

// ✅ FIXED ORDERS ROUTES - NOW WITH AUTH + POST INSTEAD OF PUT
router.get('/orders', isAuthenticated, async (req, res) => {
    try {
        console.log('👨‍💼 ADMIN VIEWING ALL ORDERS');
        
        const orders = await Order.find({})
            .populate('userId', 'name email phone')
            .populate('items.fishId')
            .sort({ createdAt: -1 })
            .lean();
        
        res.render('orders', {  // ✅ RENDER EJS INSTEAD OF JSON
            orders,
            totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
            pendingCount: orders.filter(o => o.status === 'pending').length
        });
    } catch (error) {
        console.error('❌ ADMIN ORDERS ERROR:', error);
        res.status(500).send('Server error');
    }
});

router.get('/orders/:id', isAuthenticated, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('userId', 'name email phone address')
            .populate('items.fishId')
            .lean();
        
        if (!order) return res.status(404).send('Order not found');
        
        res.render('order-details', { order });  // ✅ RENDER EJS
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// ✅ CHANGED PUT TO POST + ADDED AUTH
router.post('/orders/:id/status', isAuthenticated, async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status, updatedAt: Date.now() },
            { new: true }
        ).populate('userId', 'name phone').lean();
        
        console.log(`📦 ORDER ${req.params.id.slice(-6)} → ${status}`);
        res.json({ message: `Order updated to ${status}`, order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;