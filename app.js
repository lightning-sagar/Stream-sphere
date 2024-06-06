const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const passport = require('passport');
const LocalStrategy = require('passport-local');

const http = require('http');
const socketIO = require('socket.io');

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
const { log, Console } = require('console');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Chat = require('./models/chat.js');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const usp = io.of('/users-namespace');

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








// async function main() {
//   await mongoose.connect('mongodb://127.0.0.1:27017/streamsphere');
//   console.log('Connected to DB');
// }
// main().catch((err) => 
//   console.log(err)
// );

async function main() {
  await mongoose.connect(process.env.ATLAS_DB);
  console.log('Connected to DB');
}

main().catch((err) => 
  console.log(err)
);

const store = MongoStore.create({
  mongoUrl: process.env.ATLAS_DB,
  touchAfter: 24 * 60 * 60,
  crypto: {
    secret: process.env.SECRET
  }
})

store.on('error', function (e) {
  console.log('session store error', e)
})

app.use(
  session({
    store,
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
  res.render('pages/index.ejs',{allVideos,req});
})



//login and signup
app.get('/login', (req, res) => {
  res.render('users/login.ejs');
});
app.post('/login', passport.authenticate('local', { failureRedirect: '/login' , failureFlash: true }), (req, res) => {
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
    const allVideos = await Video.find({ categories: { $in: userCategories } }).populate('owner');
    const waitingUsers = [];
    for (const requestID of user.waiting) {
      const requestUser = await User.findById(requestID);
      if (requestUser) {
        waitingUsers.push(requestUser);
      }
    }
    res.render('pages/index.ejs', { user, currentUser: req.user, req, allVideos,waitingUsers });
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
          req.flash('error', 'Title and description are required.');
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
          req.flash('error', 'Error uploading files to Cloudinary.');
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
          req.flash('error', 'Error creating video entry in the database.');
          return res.redirect(`/user/${req.user._id}/upload`);
      }

      console.log("Video uploaded successfully:", publishVideo);
      req.flash('success', 'Video uploaded successfully.');
      res.redirect(`/user/${req.user._id}`); // Redirect to the user's home page
  } catch (error) {
      console.error("Error uploading video:", error);
      req.flash('error', 'Error uploading video.');
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


//accept request
app.put("/user/:id/requests/:friend/accept", ensureAuthenticated, async (req, res) => {
  try {
    const friendname = req.params.friend;
    const userId = req.params.id;

    const user = await User.findById(userId);
    const friendUser = await User.findOne({ username: friendname });

    if (!user) {
      req.flash("error", "User not found");
      return res.redirect(`/user/${req.user._id}`);
    }

    if (!friendUser) {
      req.flash("error", "Friend user not found");
      return res.redirect(`/user/${req.user._id}`);
    }

    const friendId = friendUser._id.toString();

    const isInWaitingList = user.waiting.some((id) => id.toString() === friendId);

    if (!isInWaitingList) {
      req.flash("error", "Friend request not found");
      return res.redirect(`/user/${req.user._id}`);
    }

    user.friends.push(friendId);
    friendUser.friends.push(userId);
    user.waiting = user.waiting.filter((id) => id.toString() !== friendId);
    console.log("Updated Waiting List:", user.waiting);
    await user.save();
    const friend = await User.findById(friendId);
    if (friend) {
      friend.friends.push(userId);
      await friend.save();
    }
    req.flash("success", "Friend request accepted successfully");
    res.redirect(`/user/${req.user._id}`);
  } catch (error) {
    console.error("Error accepting friend request:", error);
    res.status(500).send("Error accepting friend request");
  }
});

app.put("/user/:id/:friend", ensureAuthenticated, async (req, res) => {
  try {
    console.log(req.params.id, req.params.friend);
    const username = req.params.friend;
    const data = await User.findOne({ username });

    if (!data) {
      req.flash("error", "User not found");
      return res.redirect(`/user/${req.user._id}`);
    }

    const friendId = data._id;
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect(`/user/${req.user._id}`);
    }

    if (user.friends.includes(friendId) || data.waiting.includes(friendId)) {
      req.flash("error", "Friend request already sent or user is already a friend");
      return res.redirect(`/user/${req.user._id}`);
    }

    user.sendreq.push(friendId);
    data.waiting.push(userId);
    console.log("Updated Waiting List for user:", user.waiting);
    console.log("Updated Waiting List for friend:", data.waiting);
    
    await user.save();
    await data.save();

    req.flash("success", "Friend request sent successfully");
    res.redirect(`/user/${req.user._id}/dashboard/${username}`);
  } catch (error) {
    console.error("Error adding friend:", error);
    res.status(500).send("Error adding friend");
  }
});



//dashboard
app.get("/user/:id/dashboard/:username", ensureAuthenticated, async (req, res) => {
  try {
    const username = req.params.username;
    const profile = await User.findOne({ username });
    if (!profile) {
      return res.status(404).send("User not found");
    }

    const currentuser = await User.findById(req.params.id).populate('waiting');
    const videos = await Video.find({ owner: profile._id }).populate('owner');
    console.log(videos, "videos");

    // Check if only user data is requested
    if (req.query.userDataOnly) {
      return res.json({ profile, currentuser });
    }

    // Render the dashboard page with the full layout
    res.render("pages/dashboard.ejs", { req, user: req.user, username, videos, profile, currentuser });
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



//chat
 
usp.on('connection', async (socket) => {
  try {
    const userId = socket.handshake.auth.userId;

    await User.findByIdAndUpdate(userId, { $set: { is_online: true } }, { new: true });
    usp.emit('user status', { userId, is_online: true });

    socket.join(userId); // Join a room named by user ID

    socket.on('disconnect', async () => {
      try {
        await User.findByIdAndUpdate(userId, { $set: { is_online: false } }, { new: true });
        usp.emit('user status', { userId, is_online: false });
      } catch (err) {}
    });

    socket.on('existchat', async (data) => {
      try {
        const oldMessages = await Chat.find({
          $or: [
            { sender: data.sender_id, receiver: data.receiver_id },
            { sender: data.receiver_id, receiver: data.sender_id }
          ]
        }).populate('sender receiver');

        const messagesWithUsernames = oldMessages.map(msg => ({
          sender_id: msg.sender._id,
          sender_username: msg.sender.username,
          receiver_id: msg.receiver._id,
          receiver_username: msg.receiver.username,
          message: msg.message,
          seen: msg.seen,
          timestamp: msg.timestamp
        }));

        socket.emit('loadChats', messagesWithUsernames);
      } catch (error) {
        console.error('Error loading existing chat:', error);
      }
    });

    socket.on('new chat message', async (data) => {
      try {
        const { from, to, message } = data;
        const sender = await User.findById(from);
        const receiver = await User.findById(to);

        const newChatMessage = new Chat({
          sender: from,
          receiver: to,
          message: message,
          seen: false
        });


        const messageWithUsernames = {
          from_username: sender.username,
          to_username: receiver.username,
          message: message,
          timestamp: new Date(),
          sender_id: sender._id,
          to: to,
          seen: false
        };

        // Emit message to sender and receiver only
        usp.to(sender._id.toString()).emit('chat message', messageWithUsernames);
        usp.to(receiver._id.toString()).emit('chat message', messageWithUsernames);

        // Emit notification to receiver
        usp.to(receiver._id.toString()).emit('new message notification', {
          from_username: sender.username,
          message: message
        });
      } catch (error) {
        console.error('Error handling new chat message:', error);
      }
    });

    socket.on('mark as seen', async (data) => {
      try {
        await Chat.updateMany(
          {
            sender: data.receiver_id,
            receiver: data.sender_id,
            seen: false
          },
          {
            $set: { seen: true }
          }
        );
      } catch (error) {
        console.error('Error marking messages as seen:', error);
      }
    });
  } catch (error) {
    console.error('Error during user connection:', error);
  }
});
//search chat
app.get("/user/:userId/search/chat", ensureAuthenticated, async (req, res) => {
  try {
    const searchTerm = req.query.title;
    const userId = req.user._id;

    // Find users whose usernames match the search term
    const matchedUsers = await User.find({
      username: { $regex: new RegExp(searchTerm, "i") }
    });

    // Find the current user
    const currentUser = await User.findById(userId).populate('friends');

    // Separate matched users into friends and non-friends
    const friends = matchedUsers.filter(user =>
      currentUser.friends.some(friend => friend._id.equals(user._id))
    );
    const nonFriends = matchedUsers.filter(user =>
      !currentUser.friends.some(friend => friend._id.equals(user._id))
    );
    const alluser = await User.find({ _id: { $ne: userId } });

    // Render the chat page with the matched users
    res.render("pages/allchat.ejs", {
      alluser,
      req,
      friends,
      nonFriends,
      currentUser: req.user,
      chatUser: null,
      chatHistory: [],
      searchPerformed: true
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/:id/chat/all', ensureAuthenticated,async (req, res) => {
  try {
    const userId = req.user._id;
    const userchat = await User.find({ _id : { $ne: userId } });
    res.render('pages/allchat.ejs', { req, currentUser: req.user });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
  }
})
// const userId = req.user._id;

//     const usersWithChatHistory = await Chat.aggregate([
//       {
//         $match: {
//           $or: [{ sender: userId }, { receiver: userId }]
//         }
//       },
//       {
//         $group: {
//           _id: null,
//           users: {
//             $addToSet: {
//               $cond: [{ $eq: ["$sender", userId] }, "$receiver", "$sender"]
//             }
//           }
//         }
//       }
//     ]);

//     const chatUserIDs = usersWithChatHistory.length > 0 ? usersWithChatHistory[0].users : [];

//     const currentUser = await User.findById(userId);

//     const allUserIDs = [...new Set([...chatUserIDs, ...currentUser.friends, ...currentUser.waiting, ...currentUser.blocked])];

//     const userchat = await User.find({ _id: { $in: allUserIDs } });

//     res.render("pages/chat.ejs", { req, currentUser: req.user, userchat });

app.get("/:id/chat", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;

    const usersWithChatHistory = await Chat.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }]
        }
      },
      {
        $group: {
          _id: null,
          users: {
            $addToSet: {
              $cond: [{ $eq: ["$sender", userId] }, "$receiver", "$sender"]
            }
          }
        }
      }
    ]);

    const chatUserIDs = usersWithChatHistory.length > 0 ? usersWithChatHistory[0].users : [];
    const currentUser = await User.findById(userId).populate('openedChats');
    const allFriends = await User.find({ _id: { $in: currentUser.friends } });

    const unseenMessages = await Chat.find({ receiver: userId, seen: false });

    const friendsWithChat = allFriends.map(friend => {
      const hasUnseenMessages = unseenMessages.some(msg => msg.sender.toString() === friend._id.toString()) &&
                                !currentUser.openedChats.some(chat => chat._id.toString() === friend._id.toString());
      return { ...friend.toObject(), hasUnseenMessages };
    });

    res.render("pages/chat.ejs", { req, currentUser: req.user, userchat: friendsWithChat });
  } catch (error) {
    console.error('Error fetching chat users:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post("/user/:receiverId/chat/mark-opened", ensureAuthenticated, async (req, res) => {
  try {
    const receiverId = req.params.receiverId;
    const userId = req.user._id;

    await User.findByIdAndUpdate(userId, { $addToSet: { openedChats: receiverId } });

    res.status(200).send("Chat marked as opened");
  } catch (error) {
    console.error("Error marking chat as opened:", error);
    res.status(500).send("Error marking chat as opened");
  }
});





app.post("/user/:id/chat/save-message", ensureAuthenticated, async (req, res) => {
  try {
    const chat = new Chat({
      sender: req.user._id,
      receiver: req.params.id,
      message: req.body.message,
      seen: false
    });

    await chat.save();
    res.status(200).json({ success: true, message: 'Message saved successfully', chat });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save message' });
  }
});

app.post("/mark-as-seen", ensureAuthenticated, async (req, res) => {
  try {
    await Chat.updateMany(
      {
        sender: req.body.receiver_id,
        receiver: req.body.sender_id,
        seen: false
      },
      {
        $set: { seen: true }
      }
    );
    res.status(200).json({ success: true, message: 'Messages marked as seen' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to mark messages as seen' });
  }
});






// app.get("/:id/chat/history", ensureAuthenticated, async (req, res) => {
//   try {
//     const selectedUserId = req.params.id;
//     const chatHistory = await Chat.find({
//       $or: [
//         { sender: req.user._id, receiver: selectedUserId },
//         { sender: selectedUserId, receiver: req.user._id }
//       ]
//     }).sort('createdAt');

//     res.json(chatHistory);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Server error' });
//   }
// });















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
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
