const mongoose = require("mongoose");
const fs = require("fs"); // For file handling
const { Parser } = require("json2csv"); // For converting JSON to CSV
const Video = require("../models/vedio.js");

const lst = [
  "https://res.cloudinary.com/dybgs03yy/image/upload/v1727487022/ieo6innx7fm443mc6aec.webp",
  "https://res.cloudinary.com/dybgs03yy/image/upload/v1727487227/qda6snct2vhyaukrvol0.jpg",
  "https://res.cloudinary.com/dybgs03yy/image/upload/v1727490320/zmxxfaly7zsuc4lb7kbf.png",
  "https://res.cloudinary.com/dybgs03yy/image/upload/v1727490455/euqdjxg4jwk2outnybst.jpg",
  "https://res.cloudinary.com/dybgs03yy/image/upload/v1727475062/scmgwjuky4api60bhslp.jpg",
  "https://res.cloudinary.com/dybgs03yy/image/upload/v1727490587/rw2wbvbkvqbfwj4wjyif.jpg",
  "https://res.cloudinary.com/dybgs03yy/image/upload/v1727494263/z37gdu6ck0s7flo12nom.jpg",
];

async function main() {
  try {
    await mongoose.connect("mongodb+srv://lightningsagar0:s3GYdyVYq1Jx7ZF5@cluster0.otqpl50.mongodb.net/", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to DB");
    
    await initDB(); // Call initDB after connecting to the DB
    await getAllVideos(); // Call the function to get all videos and export them to CSV
  } catch (err) {
    console.error("Connection error:", err);
  } finally {
    mongoose.connection.close(); // Ensure the connection is closed after operations
  }
}

const initDB = async () => {
  try {
    // Fetch all videos (assuming `Video` has a collection in your DB)
    const allVideos = await Video.find({});
    await Video.deleteMany({});
    // Update each video's thumbnail with a random one from `lst`
    const updatedVideos = allVideos.map((video) => ({
      ...video.toObject(),
      owner: "66619677acfebd8a444b9c43",
      thumbnail: lst[Math.floor(Math.random() * lst.length)],
    }));

    await Video.insertMany(updatedVideos);

    console.log("Data is inserted with updated thumbnails");
  } catch (error) {
    console.error("Error updating thumbnails:", error);
  }
};

const getAllVideos = async () => {
  try {
    const data = await Video.find();
    
    // Convert the data to JSON
    const jsonData = data.map(item => ({
      _id: item._id.toString(),
      videoFile: item.videoFile,
      thumbnail: item.thumbnail,
      title: item.title,
      description: item.description,
      views: item.views,
      isPublished: item.isPublished,
      categories: item.categories.join(", "), // Convert array to string for CSV
      owner: item.owner.toString(),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    // Convert the JSON data to CSV format
    const fields = ['_id', 'videoFile', 'thumbnail', 'title', 'description', 'views', 'isPublished', 'categories', 'owner', 'createdAt', 'updatedAt'];
    const opts = { fields };

    const parser = new Parser(opts);
    const csv = parser.parse(jsonData);
    
    // Write the CSV data to a file
    fs.writeFileSync("videos_data.csv", csv);
    console.log("Data successfully written to videos_data.csv");
  } catch (err) {
    console.error("Error exporting data to CSV:", err);
  }
};

main(); // Start the process
