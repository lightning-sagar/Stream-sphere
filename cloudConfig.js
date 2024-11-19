const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const fs = require('fs');
const multer = require('multer');
cloudinary.config({ 
  cloud_name: 'dybgs03yy', 
  api_key: '332289123789885', 
  api_secret: 'PuGPKDLd8lTU37vu7MqS9JRtS-I' ,
  timeout: 6000000 // 10 minutes timeout
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null; 

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        fs.unlinkSync(localFilePath);  
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);  
        console.error("Error uploading to Cloudinary:", error);
        return null;
    }
};
   

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './public');  // Save uploaded files to 'public' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);  // Add timestamp to file names
  },
});

const upload = multer({ storage });


module.exports = { cloudinary,storage,uploadOnCloudinary,upload };
