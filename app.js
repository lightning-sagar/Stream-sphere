const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local');

const User = require('./models/user.js');
const Comment = require('./models/comment.js');
const {Tweet,Community,Membership} = require('./models/community.js');


const flash = require('connect-flash');
const bodyParser = require('body-parser');
const multer = require('multer');
const session = require('express-session');
const { storage, uploadOnCloudinary, cloudinary,upload } = require('./cloudConfig.js');
const Video = require('./models/vedio.js');
const MongoStore = require('connect-mongo');
const { log } = require('console');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const app = express();
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
require('dotenv').config();
require('./auth.js')
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Please login first!');
  res.redirect('/login');
};






app.use(flash()); 


app.use(methodOverride('_method'));
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, '/public')));
app.set('views', path.join(__dirname, 'views'));

// console.log(process.env.ATLAS_DB);








async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/streamsphere');
  console.log('Connected to DB');
}
main().catch((err) => 
  console.log(err)
);

// const store = MongoStore.create({
//   mongoUrl: process.env.ATLAS_DB,
//   touchAfter: 24 * 60 * 60,
//   crypto: {
//     secret: process.env.SECRET
//   }
// })

// store.on('error', function (e) {
//   console.log('session store error', e)
// })

app.use(
  session({
    // store,
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);



app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentUser = req.user;
  next();
})


//homepage
app.get('/', async (req, res) => {
  if(req.isAuthenticated()){
    res.redirect(`/user/${req.user._id}`);
  }
  const allVideos = await Video.find().populate('owner');
  console.log(allVideos);
  res.render('pages/index.ejs',{allVideos,req});
})



//login and signup
app.get('/login', (req, res) => {
  res.render('users/login.ejs');
});
app.post('/login', passport.authenticate('local', { failureRedirect: '/login' , failureFlash: true }), (req, res) => {
  console.log(req.user);
  req.flash('success', 'Welcome back!');
  res.redirect(`/user/${req.user._id}`);
});
app.get('/signup', (req, res) => {
  res.render('users/signup.ejs', {
    error: req.flash('error'),
    success: req.flash('success'),
  });
});
app.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body.user;
    console.log(req.body);

    let newUser = new User({ email, username });

    const registeredUser = await User.register(newUser, password);

    req.login(registeredUser, (err) => {
      if (err) {
        console.error(err);
        req.flash('error', 'Error signing up');
        return res.redirect('/signup');
      }

      req.flash('success', 'Registration successful! Welcome to Wanderlust.');
      res.render('pages/category.ejs', { req, currentUser: req.user });
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error signing up');
    res.redirect('/signup');
  }
});
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
      res.render('users/login.ejs', { error: 'Error logging out. Please try again.' });
    }

    req.flash('success', 'You are logged out. Goodbye!');
    res.redirect('/');
  });
});

//giving access to category
app.get('/category',ensureAuthenticated,async (req, res) => {
  const user = await User.findById(req.params.id);
  res.render('pages/category.ejs',{req,currentUser: req.user});
})
app.put('/user/:id/submit', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.params.id;
    const categories = Array.isArray(req.body.categories) ? req.body.categories : [req.body.categories]; // Ensure categories is an array
    console.log(categories);  

    const newUser = await User.findByIdAndUpdate(userId, {
      categories: categories,  
    });

    console.log("User updated:", newUser);
    res.redirect(`/user/${userId}`);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send("Error updating user");
  }
});


app.get('/user/:id', ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const userCategories = user.categories;
    console.log(userCategories, "categories");
    const allVideos = await Video.find({ categories: { $in: userCategories } }).populate('owner');
    console.log(allVideos);
    res.render('pages/index.ejs', { user, currentUser: req.user, req, allVideos });
  } catch (error) {
    console.error("Error fetching user's videos:", error);
    res.status(500).send("Error fetching user's videos");
  }
});


//upload
app.get("/user/:id/upload", ensureAuthenticated, (req, res) => {
  res.render("pages/upload.ejs", { req, currentUser: req.user });
})
app.post("/user/:id/upload", upload.fields([
  {
      name: "videoFile",
      maxCount: 1,
  },
  {
      name: "thumbnail",
      maxCount: 1,
  }
]), ensureAuthenticated, async (req, res) => {
  try {
      const { title, description, categories } = req.body; 
      console.log(req.body);
      if (!title || !description) {
          req.flash('error_msg', 'Title and description are required.');
          return res.redirect(`/user/${req.user._id}/upload`);
      }
      console.log(req.files);
      const thumbnailLocalPath = req.files['thumbnail'][0].path;
      const videoLocalPath = req.files['videoFile'][0].path;

      console.log(videoLocalPath, thumbnailLocalPath);

      const [thumbnailResponse, videoResponse] = await Promise.all([
          uploadOnCloudinary(thumbnailLocalPath),
          uploadOnCloudinary(videoLocalPath),
      ]);

      if (!thumbnailResponse || !videoResponse) {
          req.flash('error_msg', 'Error uploading files to Cloudinary.');
          return res.redirect(`/user/${req.user._id}/upload`);
      }

      const publishVideo = await Video.create({
          videoFile: videoResponse.secure_url,
          thumbnail: thumbnailResponse.secure_url,
          title,
          description,
          isPublished: false,
          categories: categories.split(",").map(category => category.trim()),  
          owner: req.user._id,
      });

      if (!publishVideo) {
          req.flash('error_msg', 'Error creating video entry in the database.');
          return res.redirect(`/user/${req.user._id}/upload`);
      }

      console.log("Video uploaded successfully:", publishVideo);
      req.flash('success_msg', 'Video uploaded successfully.');
      res.redirect(`/user/${req.user._id}`);
  } catch (error) {
      console.error("Error uploading video:", error);
      req.flash('error_msg', 'Error uploading video.');
      res.redirect(`/user/${req.user._id}/upload`);
  }
});




//watch video
app.get("/user/:id/videos/:video", ensureAuthenticated, async (req, res) => {
  try {
    const userCategory = req.user.category;
    const allVideos = await Video.find({ category: userCategory }).populate('owner');
    const videos = await Video.find({ _id: req.params.video,category: userCategory }).populate('owner');
    const comment = await Comment.find({ video: req.params.video }).populate('owner');
    console.log(comment,"comment");
    res.render("pages/watch.ejs", { req, currentUser: req.user, videos,allVideos,comment });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});



//dashboard
app.get("/user/:id/our-video", ensureAuthenticated, async (req, res) => {
  try {
    const id = req.params.id;
    const profile = await User.findById(id);
    const videos = await Video.find({ owner: req.params.id }).populate('owner');
    res.render("pages/dashboard.ejs", { req, user: req.user, videos,profile });
  } catch (error) {
    console.error("Error retrieving videos:", error);
    res.status(500).send("Error retrieving videos");
  }
});
app.get("/user/:id/edit", ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    res.render("pages/edit.ejs", { req, currentUser: req.user, id, user });
  } catch (error) {
    console.error("Error retrieving video:", error);
    res.status(500).send("Error retrieving video");
  }
})
app.put("/user/:id/edit/profile", ensureAuthenticated, upload.fields([
  {
    name: "avatar",
    maxCount: 1,
  }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, category } = req.body;
    
    // Check if avatar field is present in the request body
    let avatarUrl;
    if (req.files['avatar'] && req.files['avatar'].length > 0) {
      const avatarLocalPath = req.files['avatar'][0].path;
      const [avatarResponse] = await Promise.all([
        uploadOnCloudinary(avatarLocalPath)
      ]);

      if (!avatarResponse) {
        throw new Error("Error uploading avatar to Cloudinary.");
      }
      avatarUrl = avatarResponse.secure_url;
    }
    
    // Find the user by ID and update the fields
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        ...(username && { username }), // If username exists, update it
        ...(email && { email }), // If email exists, update it
        ...(category && { category }), // If category exists, update it
        ...(avatarUrl && { avatar: avatarUrl }) // If avatarUrl exists, update it
      },
      { new: true }
    );

    if (!updatedUser) {
      throw new Error("User not found");
    }

    console.log("User updated successfully:", updatedUser);
    res.redirect(`/user/${req.user._id}`);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send("Error updating user");
  }
});

//post comment 
app.post("/user/:id/videos/:video/comments", ensureAuthenticated, async (req, res) => {
  try {
    const { content } = req.body;
    console.log(req.body);
    const { id, video } = req.params;
    const newComment = await Comment.create({
      content,
      video,
      owner: id
    })
    console.log("Comment added:", newComment);
    res.redirect(`/user/${req.user._id}/videos/${req.params.video}`);
  } catch (error) {
    console.error("Error adding comment:", error);
    res.status(500).send("Error adding comment");
  }
})

//likes
app.post("/user/:id/videos/:video/comments/:commentId/like", ensureAuthenticated, async (req, res) => {
  try {
    const { id, video,commentId } = req.params;

    const liked = await Comment.findOneAndUpdate(
      { _id: commentId },
      { $addToSet: { likes: id } },  
      { new: true }
    ).populate('owner');

    if (!liked) {
      console.error("Comment not found");
      return res.status(404).send("Comment not found");
    }

    console.log("Like added:", liked);
    res.redirect(`/user/${req.user._id}/videos/${req.params.video}`);
  } catch (error) {
    console.error("Error adding like:", error);
    res.status(500).send("Error adding like");
  }
})
app.post("/user/:id/videos/:video/comments/:commentId/unlike", ensureAuthenticated, async (req, res) => {
  try {
    const { id, video,commentId } = req.params;

    const liked = await Comment.findOneAndUpdate(
      { _id: commentId },
      { $pull: { likes: id } }, 
      { new: true }
    ).populate('owner');

    if (!liked) {
      console.error("Comment not found");
      return res.status(404).send("Comment not found");
    }

    console.log("Like added:", liked);
    res.redirect(`/user/${req.user._id}/videos/${req.params.video}`);
  } catch (error) {
    console.error("Error adding like:", error);
    res.status(500).send("Error adding like");
  }
})


//community
app.get('/user/:id/community', ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      throw new Error('User not found');
    }
    const userCategories = user.categories;
    const communities = await Community.find({ categories: { $in: userCategories } });
    const allTweets = await Tweet.find({ community: { $in: communities.map(community => community._id) } }).populate('owner');
    console.log(allTweets,communities);
    res.render('pages/community.ejs', { user, req,currentUser: req.user,userCategories, communities, allTweets });
  } catch (error) {
    console.error('Error fetching community data:', error);
    res.status(500).send('Error fetching community data');
  }
});
app.post('/user/:id/tweet', ensureAuthenticated, async (req, res) => {
  try{
    const user = await User.findById(req.params.id);
    if(!user){
      throw new Error('User not found');
    }
    const tweet = await Tweet.create({
      content: req.body.content,
      owner: req.user._id
    })
    user.tweets.push(tweet._id);
    await user.save();
    res.redirect(`/user/${req.user._id}/community`);
  }catch(e){
    console.log(e);
  }
})






  app.get('/auth/google',
  passport.authenticate('google', { scope:
    ['https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/userinfo.email']
   }
));

app.get( '/auth/google/callback',
    passport.authenticate( 'google', {
        successRedirect: '/auth/google/success',
        failureRedirect: '/auth/google/failure'
}));

app.get('/auth/google/success', (req, res) => {
  console.log(req.user);
  req.flash('success', 'Authenticated with Google successfully!');
  res.redirect(`/user/${req.user._id}`);
});

app.get('/auth/google/failure', (req, res) => {
  req.flash('error', 'Failed to authenticate with Google. Please try again.');
  res.redirect('/signup')
})

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
