const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");
dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
});

const uploadToCloudinary = async (filePath, resourceType = "image") => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            resource_type: resourceType,
        });
        return result;
    } catch (err) {
        console.error("Upload error:", err);
        return null;
    }
};

module.exports = { uploadToCloudinary };
