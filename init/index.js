const mongoose = require('mongoose');
const User = require('../models/user'); // Adjust the path as necessary

async function initializeUserData() {
  try {
    await mongoose.connect(process.env.ATLAS_DB, { // Change to your database URL
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    const result = await User.updateMany(
      {}, 
      {
        $set: {
          friends: [],
          waiting: [],
          blocked: []
        }
      }
    );

    console.log(`${result.nModified} user documents updated.`);
    mongoose.connection.close();
  } catch (error) {
    console.error('Error initializing user data:', error);
    mongoose.connection.close();
  }
}

initializeUserData();
