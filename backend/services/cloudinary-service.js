const cloudinary = require('cloudinary').v2;
const fs = require('fs');
// console.log(process.env.CLOUDINARY_CLOUD_NAME, process.env.CLOUDINARY_API_KEY,process.env.CLOUDINARY_API_SECRET )

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            return null;
        }
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });

        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        return response;
    } catch (error) {
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        console.log(error.message)
        return error;
    }
};

module.exports = {
    uploadOnCloudinary,
};
