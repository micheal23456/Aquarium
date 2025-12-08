const mongoose = require('mongoose');

const fishSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        maxlength: [500, 'Name cannot exceed 500 characters']
    },
    photo: {
        type: String, // URL or file path for the fish photo
        required: [true, 'Photo is required']
    },
    video: {
        type: String, // URL or file path for the fish video (optional)
        maxlength: [1000, 'Video URL cannot exceed 1000 characters']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    type: {
        type: String,
        required: [true, 'Type is required'],
        maxlength: [100, 'Type cannot exceed 100 characters']
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const Fish = mongoose.model('Fish', fishSchema);

module.exports = Fish;
