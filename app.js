var createError = require('http-errors');
var express = require('express');
const cors = require("cors");
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var session = require('express-session');
const multer = require('multer');
require('dotenv').config();

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// 🚨 MOVE DB IMPORT HERE (before middleware)
const connectDB = require('./database/db');  // Import function, not connection
const Admin = require('./models/admin');

// Multer Config (unchanged)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only images and videos allowed!'), false);
        }
    }
});

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middleware (unchanged)
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
}));

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-super-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true, 
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', indexRouter);
app.use('/api', usersRouter);

app.use(function(req, res, next) {
    next(createError(404));
});

app.use(function(err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

// 🚨 NEW: Start server ONLY after DB connects
const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        // Connect to DB first
        await connectDB();
        console.log('✅ MongoDB connected, starting server...');
        
        // Create default admin
        try {
            await Admin.deleteMany({});
            console.log('🗑️ Cleared old admins');
            
            const admin = new Admin({ 
                email: 'admin@example.com',
                name: 'Admin User'
            });
            await admin.setPassword('admin123'); 
            await admin.save();
            console.log('👤 NEW Admin: admin@example.com / admin123');
        } catch (err) {
            console.error('⚠️ Admin setup skipped:', err.message);
        }
        
        // Start server LAST
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
        
    } catch (err) {
        console.error('❌ DB connection failed:', err.message);
        process.exit(1);
    }
}

startServer();
