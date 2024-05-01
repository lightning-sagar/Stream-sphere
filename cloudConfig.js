const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const fs = require('fs');
const multer = require('multer');
cloudinary.config({ 
  cloud_name: 'dybgs03yy', 
  api_key: '332289123789885', 
  api_secret: 'PuGPKDLd8lTU37vu7MqS9JRtS-I' 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null; 

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        console.log("working");
        // fs.unlinkSync(localFilePath);  
        return response;
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error);
        return null;
    }
};


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public')
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname)
  }
})

const upload = multer({ storage })

module.exports = { cloudinary,storage,uploadOnCloudinary,upload };
