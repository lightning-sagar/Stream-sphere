const mongoose = require("mongoose");
const initData = require("./data.js");
const Video = require("../models/vedio.js");
 
// const getallvideos = async () => {
//   await mongoose.connect("mongodb+srv://lightningsagar0:s3GYdyVYq1Jx7ZF5@cluster0.otqpl50.mongodb.net/");
//   const data = await Video.find();
 
//   function convertToJSON(data) {
//     return data.map(item => {
//       return {
//         ...item,
//         _id: item._id.toString(),
//         owner: item.owner.toString(),
//         createdAt: item.createdAt.toISOString(),
//         updatedAt: item.updatedAt.toISOString(),
//       };
//     });
//   }
  
 
//   const jsonData = convertToJSON(data);
  
 
//   console.log(JSON.stringify(jsonData, null, 2));
//   mongoose.connection.close();
// }
// getallvideos()




























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
