const mongoose = require("mongoose");
const fs = require("fs"); // For file handling
const { Parser } = require("json2csv"); // For converting JSON to CSV
const Video = require("../models/vedio.js");

// const getallvideos = async () => {
//   await mongoose.connect("mongodb+srv://lightningsagar0:s3GYdyVYq1Jx7ZF5@cluster0.otqpl50.mongodb.net/");
  
//   const data = await Video.find();

//   // Convert the data to JSON
//   function convertToJSON(data) {
//     return data.map(item => {
//       return {
//         _id: item._id.toString(),
//         videoFile: item.videoFile,
//         thumbnail: item.thumbnail,
//         title: item.title,
//         description: item.description,
//         views: item.views,
//         isPublished: item.isPublished,
//         categories: item.categories.join(", "), // Convert array to string for CSV
//         owner: item.owner.toString(),
//         createdAt: item.createdAt.toISOString(),
//         updatedAt: item.updatedAt.toISOString(),
//       };
//     });
//   }

//   const jsonData = convertToJSON(data);

//   // Convert the JSON data to CSV format
//   const fields = ['_id', 'videoFile', 'thumbnail', 'title', 'description', 'views', 'isPublished', 'categories', 'owner', 'createdAt', 'updatedAt'];
//   const opts = { fields };

//   try {
//     const parser = new Parser(opts);
//     const csv = parser.parse(jsonData);
    
//     // Write the CSV data to a file
//     fs.writeFileSync("videos_data.csv", csv);
//     console.log("Data successfully written to videos_data.csv");
//   } catch (err) {
//     console.error(err);
//   }

//   mongoose.connection.close();
// }

// getallvideos();








// main().then(()=>{
//   console.log("connectrd to DB");
// })
// .catch(err => console.log(err))

// async function main() {
//   await mongoose.connect("mongodb+srv://lightningsagar0:s3GYdyVYq1Jx7ZF5@cluster0.otqpl50.mongodb.net/");
// }

// const initDB = async () => {
// //   await Video.deleteMany();
//   initData.data = initData.data.map((obj)=>({
//     ...obj,owner:"6661c0330f0b5138c9819cf9"
//   }))
//   await Video.insertMany(initData.data)
//   console.log("data is inserted");
// }

// initDB()
// ef73ff