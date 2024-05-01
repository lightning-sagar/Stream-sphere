const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user.js');
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
app.get('/', (req, res) => {
  if(req.isAuthenticated()){
    res.redirect(`/user/${req.user._id}`);
  }
  res.render('pages/index.ejs');
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
app.put('/user/:id/:category', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.params.id;
    const category = req.params.category;
    const userData = req.body.user;
    console.log(category);
    const user = await User.findById(userId);

    const newuser = await User.findByIdAndUpdate(userId, {
      category,
    })
    await newuser.save();

    console.log("User updated:", newuser);
    res.redirect(`/user/${userId}`);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send("Error updating user");
  }
});


app.get('/user/:id', ensureAuthenticated, async (req, res) => {
  const user = await User.findById(req.params.id);
  const allVideos = await Video.find({});
  res.render('pages/index.ejs', { user,req,currentUser: req.user, allVideos });
})

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
    const { title, description } = req.body;
    if (!title || !description) {
      throw new Error("Title and description are required.");
    }
    console.log(req.files.thumbnail[0].path, req.files.thumbnail);
    const thumbnailLocalPath = req.files['thumbnail'][0].path;
    const vedioLocalPath = req.files['videoFile'][0].path;

    console.log(vedioLocalPath, thumbnailLocalPath);

    // Upload video file and thumbnail to Cloudinary
    const [thumbnailResponse, videoResponse] = await Promise.all([
      uploadOnCloudinary(thumbnailLocalPath),
      uploadOnCloudinary(vedioLocalPath)
    ]);

    if (!thumbnailResponse || !videoResponse) {
      throw new Error("Error uploading files to Cloudinary.");
    }

    const publishVideo = await Video.create({
      videoFile: videoResponse.secure_url,
      thumbnail: thumbnailResponse.secure_url,
      title,
      description,
      isPublished: false,
      owner: req.user._id,
    });

    if (!publishVideo) {
      throw new Error("Error creating video entry in the database.");
    }

    console.log("Video uploaded successfully:", publishVideo);
    res.redirect(`/user/${req.user._id}`);
  } catch (error) {
    console.error("Error uploading video:", error);
    res.status(500).send("Error uploading video");
  }
});

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
