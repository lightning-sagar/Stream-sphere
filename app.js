const express = require("express");
const mongoose = require("mongoose");
const { isValidObjectId } = require("mongoose");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const axios = require("axios");

const http = require("http");
const socketIO = require("socket.io");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const fs = require("fs");
const path = require("path");
const csvWriter = require("csv-write-stream");

const genAI = new GoogleGenerativeAI("AIzaSyBzAaNuBfgF8-_S3xHkBEaQcXdO8Q3hVE0");
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const User = require("./models/user.js");
const Comment = require("./models/comment.js");
const Subscription = require("./models/subscription.js");
const WatchHistory = require("./models/watchhistory.js");
const Post = require("./models/Post.js");

const flash = require("connect-flash");
const bodyParser = require("body-parser");
const multer = require("multer");
const session = require("express-session");
const {
  storage,
  uploadOnCloudinary,
  cloudinary,
  upload,
} = require("./cloudConfig.js");
const Video = require("./models/vedio.js");
const MongoStore = require("connect-mongo");
const { log, Console, error } = require("console");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const Chat = require("./models/chat.js");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const usp = io.of("/users-namespace");

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

require("dotenv").config();
require("./auth.js");
const ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("error", "Please login first!");
  res.redirect("/login");
};

app.use(flash());

app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "/public")));
app.set("views", path.join(__dirname, "views"));

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
  console.log("Connected to DB");
}

main().catch((err) => console.log(err));

const store = MongoStore.create({
  mongoUrl: process.env.ATLAS_DB,
  touchAfter: 24 * 60 * 60,
  crypto: {
    secret: process.env.SECRET,
  },
});

store.on("error", function (e) {
  console.log("session store error", e);
});

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
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currentUser = req.user;
  next();
});

//homepage

app.get("/", async (req, res) => {
  if (req.isAuthenticated()) {
    res.redirect(`/user/${req.user._id}`);
  }
  const allVideos = await Video.find().populate("owner");
  res.render("pages/index.ejs", { allVideos, req });
});

//login and signup
app.get("/login", (req, res) => {
  if (!req.isAuthenticated()) {
    res.render("users/login.ejs");
  } else {
    res.redirect(`/user/${req.user._id}`);
  }
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (req, res) => {
    req.flash("success", "Welcome back!");
    res.redirect(`/user/${req.user._id}`);
  }
);
app.get("/signup", (req, res) => {
  if (!req.isAuthenticated()) {
    res.render("users/signup.ejs", {
      error: req.flash("error"),
      req,
      success: req.flash("success"),
    });
  } else {
    res.redirect(`/user/${req.user._id}`);
  }
});
app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body.user;
    console.log(req.body);

    let newUser = new User({ email, username });

    const registeredUser = await User.register(newUser, password);

    req.login(registeredUser, (err) => {
      if (err) {
        console.error(err);
        req.flash("error", "Error signing up");
        return res.redirect("/signup");
      }

      req.flash("success", "Registration successful! Welcome to Wanderlust.");
      res.render("pages/category.ejs", { req, currentUser: req.user });
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Error signing up");
    res.redirect("/signup");
  }
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
      res.render("users/login.ejs", {
        error: "Error logging out. Please try again.",
      });
    }

    req.flash("success", "You are logged out. Goodbye!");
    res.redirect("/");
  });
});

//giving access to category
app.get("/category", ensureAuthenticated, async (req, res) => {
  const user = await User.findById(req.params.id);
  res.render("pages/category.ejs", { req, currentUser: req.user });
});
app.put("/user/:id/submit", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.params.id;
    console.log(req.body, "req.body");
    const categories = Array.isArray(req.body.categories)
      ? req.body.categories
      : [req.body.categories];
    console.log(categories);

    const newUser = await User.findByIdAndUpdate(userId, {
      categories: categories,
    });

    res.redirect(`/user/${userId}`);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send("Error updating user");
  }
});

const getrecommendations = async (videoData) => {
  try {//https://stream-sphere-ml.onrender.com
    console.log(videoData)
    const response = await fetch("https://stream-sphere-ml.onrender.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(videoData),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error from API:', errorText); // Log the actual response for debugging
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    if (data.message === "Recommendations fetched successfully") {
      return data.recommended_ids;
    } else {
      console.log("Error fetching recommendations:", data);
      return [];  
    }
  } catch (error) {
    console.error("ML model is not running:", error);
    return [];  
  }
};

app.get("/user/:id", ensureAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("watchHistory");
    const userCategories = user.categories;
    console.log(userCategories);
    const allVideos = await Video.find({
      categories: { $in: userCategories },
    }).populate("owner");

    const waitingUsers = [];
    for (const requestID of user.waiting) {
      const requestUser = await User.findById(requestID);
      if (requestUser) {
        waitingUsers.push(requestUser);
      }
    }

    let recommendedVideos = [];
    if (user.watchHistory.length > 0) {
      const lastWatchHistoryEntry =
        user.watchHistory[user.watchHistory.length - 1];
      const watchHistory = await WatchHistory.findById(lastWatchHistoryEntry).populate("video");
    
      const lastWatchedVideo = watchHistory.video;
    
      const recommendationIds = await getrecommendations({
        title: lastWatchedVideo.title,
      });
    
      recommendedVideos = await Video.find({ _id: { $in: recommendationIds } }).populate("owner");
    
      if (recommendedVideos.length < 6) {
        const additionalVideos = await Video.find({
          categories: { $in: userCategories },
          _id: { $nin: recommendedVideos.map((v) => v._id) },
        }).populate("owner").limit(6 - recommendedVideos.length);
    
        recommendedVideos = [...recommendedVideos, ...additionalVideos];
      }
    } else {
      recommendedVideos = await Video.find({ categories: { $in: userCategories } }).populate("owner").limit(10);
    }
    
    res.render("pages/index.ejs", {
      user,
      currentUser: req.user,
      req,
      allVideos,
      waitingUsers,
      recommendedVideos,
    });
  } catch (error) {
    console.error("Error fetching user's videos:", error);
    res.status(500).send("Error fetching user's videos");
  }
});

app.get("/user/:id/upload", ensureAuthenticated, (req, res) => {
  res.render("pages/upload.ejs", { req, currentUser: req.user });
});
const { Parser } = require("json2csv");

app.post("/user/:id/upload", ensureAuthenticated, async (req, res) => {
  try {
    console.log("req.body", req.body);

    const { title, description, categories, videoFileUrl, thumbnailUrl } =
      req.body;

    if (!title || !description || !videoFileUrl || !thumbnailUrl) {
      req.flash("error", "Title and description are required.");
      return res.redirect(`/user/${req.user._id}/upload`);
    }

    const publishVideo = await Video.create({
      videoFile: videoFileUrl,
      thumbnail: thumbnailUrl,
      title,
      description,
      isPublished: false,
      categories,
      owner: req.user._id,
    });

    if (!publishVideo) {
      console.error("Error publishing video:", publishVideo);
      return res.redirect(`/user/${req.user._id}/upload`);
    }

    await publishVideo.save();
    const videoId = publishVideo._id;
    const data = await Video.find({ _id: videoId });

    // Function to escape and format the data for CSV
    function escapeField(field) {
      if (typeof field === "string") {
        // Remove Markdown characters and escape quotes
        return field
          .replace(/[*]+/g, "")
          .replace(/"/g, '""')
          .replace(/\n/g, " ")
          .trim();
      }
      return field;
    }

    // Convert the data to the required format (array of values as strings)
    function convertToCSVFormat(data) {
      return data.map((item) => [
        `"${item._id}"`, // ID as string
        `"${item.videoFile}"`, // Video URL as string
        `"${item.thumbnail}"`, // Thumbnail URL as string
        `"${escapeField(item.title)}"`, // Title
        `"${escapeField(item.description)}"`, // Description
        `${item.views || 0}`, // Views as string (default to 0 if undefined)
        `${item.isPublished}`, // Is Published status (boolean as string)
        `"${item.categories.join(", ")}"`, // Categories (array converted to string)
        `"${item.owner}"`, // Owner ID as string
        `"${item.createdAt.toISOString()}"`, // Created at timestamp as string
        `"${item.updatedAt.toISOString()}"`, // Updated at timestamp as string
      ]);
    }

    const csvDataArray = convertToCSVFormat(data);

    try {
      const csvFilePath = path.join(
        __dirname,
        "recommendation_system",
        "datasets",
        "videos_data.csv"
      );
      const fileExists = fs.existsSync(csvFilePath);

      // Convert the data array to a string with proper line breaks
      const csvDataString = csvDataArray.map((row) => row.join(",")).join("\n");

      if (!fileExists) {
        // Add headers if the file does not exist
        const headers = [
          "ID",
          "Video URL",
          "Thumbnail URL",
          "Title",
          "Description",
          "Views",
          "Is Published",
          "Categories",
          "Owner ID",
          "Created At",
          "Updated At",
        ];
        // Write headers and data to the file
        fs.writeFileSync(
          csvFilePath,
          headers.join(",") + "\n" + csvDataString + "\n",
          { flag: "w" }
        );
      } else {
        // Append data to the file (ensure each row starts on a new line)
        fs.appendFileSync(csvFilePath, csvDataString + "\n", { flag: "a" });
      }

      console.log("Data successfully written to videos_data.csv");
    } catch (err) {
      console.error("Error generating CSV:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to generate CSV" });
    }

    console.log("Video published and saved to CSV:", publishVideo);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error uploading video:", error);
    req.flash("error", "Error uploading video.");
    res.redirect(`/user/${req.user._id}/upload`);
  }
});

app.post(
  "/upload-files",
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  ensureAuthenticated,
  async (req, res) => {
    try {
      const videoLocalPath = req.files["videoFile"][0].path;
      const thumbnailLocalPath = req.files["thumbnail"][0].path;

      const [thumbnailResponse, videoResponse] = await Promise.all([
        uploadOnCloudinary(thumbnailLocalPath),
        uploadOnCloudinary(videoLocalPath),
      ]);

      if (!thumbnailResponse || !videoResponse) {
        return res
          .status(500)
          .json({ success: false, message: "File upload failed" });
      }

      res.status(200).json({
        success: true,
        videoUrl: videoResponse.secure_url,
        thumbnailUrl: thumbnailResponse.secure_url,
      });
    } catch (error) {
      console.error("Error uploading files:", error);
      res
        .status(500)
        .json({ success: false, message: "Error uploading files" });
    }
  }
);

async function fileToGenerativePart(url, mimeType) {
  try {
    console.log(`Downloading image from: ${url}`);

    const response = await axios.get(url, { responseType: "arraybuffer" });
    console.log("Image downloaded successfully.");

    // Assign the downloaded data to a buffer variable
    const buffer = Buffer.from(response.data); // Correctly define buffer

    console.log("Image converted to buffer.");

    const base64Image = buffer.toString("base64");
    console.log("Image converted to Base64.");

    return {
      inlineData: {
        data: base64Image,
        mimeType,
      },
    };
  } catch (error) {
    console.error("Error in fileToGenerativePart:", error);
    throw error;
  }
}

async function deleteFromCloudinary(publicId) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        console.error("Error deleting from Cloudinary:", error);
        return reject(error);
      }
      console.log("Successfully deleted from Cloudinary:", result);
      resolve(result);
    });
  });
}

app.post("/delete-files", ensureAuthenticated, async (req, res) => {
  const { videoUrl, thumbnailUrl } = req.body;

  try {
    // Extract public IDs from URLs
    const videoPublicId = videoUrl.split("/").pop().split(".")[0]; // Adjust based on your URL format
    const thumbnailPublicId = thumbnailUrl.split("/").pop().split(".")[0]; // Adjust based on your URL format

    // Delete files from Cloudinary
    await deleteFromCloudinary(videoPublicId);
    await deleteFromCloudinary(thumbnailPublicId);

    res
      .status(200)
      .json({ success: true, message: "Files deleted successfully." });
  } catch (error) {
    console.error("Error deleting files:", error);
    res.status(500).json({ success: false, message: "Error deleting files." });
  }
});
const marked = require("marked");
app.post("/generate-description", ensureAuthenticated, async (req, res) => {
  try {
    console.log("Generating description...", req.body);
    const { thumbnailUrl } = req.body;
    console.log(`Received thumbnail URL: ${thumbnailUrl}`);

    const imagePart = await fileToGenerativePart(thumbnailUrl, "image/jpeg");
    console.log("Image part generated:", imagePart);

    const prompt = "Describe how this product might be manufactured.";
    console.log("Prompt:", prompt);

    const result = await model.generateContent([prompt, imagePart]);
    console.log("Generative model result:", result);

    const candidate = result.response.candidates[0];
    console.log("First candidate:", candidate);

    const description = candidate.content.parts[0];
    console.log("Description generated:", description);

    if (description) {
      // Convert the description to HTML using marked
      const descriptionHTML = marked.parse(description.text);
      console.log("Generated HTML:", descriptionHTML);

      res.status(200).json({
        success: true,
        description: descriptionHTML, // Send the HTML instead of plain text
      });
    } else {
      console.log("Failed to generate description:", result);
      res.status(500).json({
        success: false,
        message: "Failed to generate description",
      });
    }
  } catch (error) {
    console.error("Error generating description:", error);
    res.status(500).json({
      success: false,
      message: "Error generating description",
    });
  }
});

app.get("/videos/:id", ensureAuthenticated, async (req, res) => {
  res.redirect("/login");
});
//watch video
app.get("/user/:id/videos/:video", ensureAuthenticated, async (req, res) => {
  try {
    // Get the user's category
    const userCategory = req.user.categories;

    // Find the video based on the ID and category
    const video = await Video.findOne({ _id: req.params.video }).populate(
      "owner"
    );

    if (!video) {
      return res.status(404).send("Video not found");
    }

    // Check if the user is subscribed to the video owner's channel
    const videoOwnerId = video.owner._id.toString();
    const subscription = await Subscription.findOne({
      subscriber: req.user._id,
      channel: videoOwnerId,
    });
    const subscribed = !!subscription;

    // Count the number of likes on the video
    const likesCount = await Like.countDocuments({ video: req.params.video });

    // Fetch comments and organize them into threads
    const comments = await Comment.find({ video: req.params.video })
      .populate("owner")
      .lean();
    const threadedComments = organizeComments(comments);

    // Add video to user's watch history
    const existingWatchHistory = await WatchHistory.findOne({
      user: req.user._id,
      video: req.params.video,
    });

    if (!existingWatchHistory) {
      const newWatchHistory = new WatchHistory({
        user: req.user._id,
        video: req.params.video,
      });

      await newWatchHistory.save();

      // Update the user's watch history by adding the watch history entry ID
      await User.findByIdAndUpdate(req.user._id, {
        $push: { watchHistory: newWatchHistory._id },
      });
    }

    // Get video recommendations
    const videoData = {
      channelName: video.owner.username,
      title: video.title,
      description: video.description,
    };

    const get_ids = await getrecommendations(videoData);
    const get_videos = await Video.find({ _id: { $in: get_ids } }).populate(
      "owner"
    );
    let allVideos = get_videos.filter(
      (v) => v._id.toString() !== req.params.video
    );
    if(allVideos.length>0){
      allVideos = await Video.find({ categories:userCategory  })
    }
    // Render the watch page
    res.render("pages/watch.ejs", {
      req,
      currentUser: req.user,
      video,
      otherVideos: allVideos,
      comments: threadedComments,
      subscribed,
      likesCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/user/:id/history", ensureAuthenticated, async (req, res) => {
  try {
    const watchHistory = await WatchHistory.find({ user: req.params.id })
      .populate("video")
      .sort({ watchedAt: -1 });

    if (!watchHistory) {
      return res.status(404).send("No watch history found.");
    }

    res.render("pages/history.ejs", {
      req,
      currentUser: req.user,
      watchHistory,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});
app.delete(
  "/user/:id/history/:historyId",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const { historyId, id } = req.params;

      // Ensure the user can only delete their own history
      const historyItem = await WatchHistory.findOne({
        _id: historyId,
        user: id,
      });

      if (!historyItem) {
        return res.status(404).send("History item not found.");
      }

      // Remove the video from the user's watch history
      await WatchHistory.deleteOne({ _id: historyId });

      res.status(200).send("History item deleted successfully.");
    } catch (error) {
      console.error(error);
      res.status(500).send("Internal server error.");
    }
  }
);

function organizeComments(comments) {
  const commentMap = {};
  comments.forEach((comment) => {
    commentMap[comment._id] = comment;
    comment.children = [];
  });

  const threadedComments = [];
  comments.forEach((comment) => {
    if (comment.parent) {
      if (commentMap[comment.parent]) {
        commentMap[comment.parent].children.push(comment);
      }
    } else {
      threadedComments.push(comment);
    }
  });
  return threadedComments;
}
//tweet
app.get("/t/:id", async (req, res) => {
  try{
    const currentuser = await User.findById(req.user._id);
    const getTweet = await Post.find().populate("posted_by");
    console.log(getTweet);
    res.render("pages/tweet.ejs",{req,currentuser,getTweet});
  }
  catch(error){
    console.log(error,"error");
  }
})
app.post("/t/:id", async (req, res) => {
  try {
    console.log(req.params.id);
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).send("User not found");
    }
    
    console.log(req.body);
    let { postText, postImage } = req.body;
    
    if (postImage !== null && postImage !== undefined) {
      const uploadedImage = await cloudinary.uploader.upload(postImage);
      console.log(uploadedImage);
      postImage = uploadedImage.secure_url;
    }

    const newPost = new Post({
      text: postText,
      img: postImage || null,
      posted_by: req.user._id
    });

    await newPost.save();

    const populatedPost = await Post.findById(newPost._id).populate('posted_by', 'username avatar');
    return res.status(200).json({
      message: "Post created successfully",
      newPost:populatedPost
    });

  } catch (error) {
    console.error(error);
    return res.status(500).send("Internal Server Error");
  }
});
app.delete("/t/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const post = await Post.findById(id);
    if(!post) return res.status(400).json({error:"Post not found"});

    if(post.posted_by.toString() !== req.user._id.toString()){
        return res.status(400).json({error:"not authorized"});
    }

    if(post.img){
        const publicId = post.img.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
    }

    await Post.findByIdAndDelete(id);
    res.status(200).json({message:"success"});
  } catch (error) {
    console.log(error)
    return res.status(500).send("Internal Server Error");
  }
})
app.post("/t/:id/likeunlike", async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) return res.status(400).json({ error: "Post not found" });

    const userLikePost = post.likes.includes(req.user._id);

    if (userLikePost) {
      // Unlike post
      await Post.findByIdAndUpdate(id, { $pull: { likes: req.user._id } });
      res.status(200).json({ message: "success" });
    } else {
      // Like post
      post.likes.push(req.user._id);
      await post.save();
      res.status(200).json({ message: "success" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
})

app.post("/t/:id/reply", async (req, res) => {
  try {
    console.log(req.body)
    const { id: postId } = req.params;
    const { replyText } = req.body;
    const userId = req.user._id;
    const userProfilepic = req.user.avatar;
    const username = req.user.username;
    const text = replyText;
    if (!text) return res.status(400).json({ error: "All fields are required" });
    const post = await Post.findById(postId);
    if (!post) return res.status(400).json({ error: "Post not found" });

    const newReply = {
        userId,
        userPic:userProfilepic,
        username,
        text
    };
    console.log(newReply)
    post.replies.push(newReply);
    await post.save();

    res.status(200).json({ reply: newReply });
} catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
}
})
app.get('/t/r/:id',async(req,res)=>{
  try {
    const {id} = req.params;
    const post = await Post.findById(id).populate('posted_by', 'username avatar');
    const reply = post.replies
    console.log(reply);
    res.render('pages/showTweet.ejs',{req,replies:reply,tweet:post});
  } catch (error) {
    console.log(error);
    return res.status(500).send("Internal Server Error");
  }
})


//comment
app.post("/v/:videoId", async (req, res) => {
  try {
    const { content, parent } = req.body;
    const videoId = req.params.videoId;
    const newComment = new Comment({
      content,
      owner: req.user._id,
      video: videoId,
      parent: parent || null,
    });
    await newComment.save();
    res.redirect(`back`);
  } catch (error) {
    res.status(500).send(error.message);
  }
});
app.delete("/comments/:id", async (req, res) => {
  try {
    const commentId = req.params.id;
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Update child comments to set their parent to null
    await Comment.updateMany(
      { parent: new mongoose.Types.ObjectId(commentId) }, // Use mongoose.Types.ObjectId to convert commentId correctly
      { $set: { parent: null } }
    );

    // Delete the comment itself
    await Comment.deleteOne({ _id: commentId });

    res.status(200).json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Error deleting comment:", error);
    res.status(500).json({ message: "Server error" });
  }
});

//subcribe
app.get("/s/:channelId", ensureAuthenticated, async (req, res) => {
  const { channelId } = req.params;
  console.log(channelId, "channelId");
  const subscriberId = channelId;
  const user = await User.findById(subscriberId);
  const aggregate = [
    {
      $match: {
        subscriber: subscriberId,
      },
    },
    {
      $group: {
        _id: null,
        totalCount: { $sum: 1 },
      },
    },
  ];

  const subscribedList = await Subscription.aggregate(aggregate);

  console.log(subscribedList, "subscribedList");
});
app.post("/s/:channelId", ensureAuthenticated, async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user._id;

    const channel = await User.findById(channelId);
    if (!channel) {
      return res
        .status(404)
        .json({ success: false, message: "Channel not found" });
    }

    const existingSubscription = await Subscription.findOne({
      subscriber: userId,
      channel: channelId,
    });

    if (existingSubscription) {
      await Subscription.findByIdAndDelete(existingSubscription._id);
      console.log("Unsubscribed successfully");
      return res.redirect(`/user/${userId}/dashboard/${channel.username}`)
    } else {
      await Subscription.create({
        subscriber: userId,
        channel: channelId,
      });
      console.log("Subscribed successfully");
      return res.redirect(`/user/${userId}/dashboard/${channel.username}`)
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

// Helper function to get subscriber count
async function getSubscriberCount(channelId) {
  const aggregate = [
    { $match: { channel: channelId } },
    { $group: { _id: null, totalCount: { $sum: 1 } } },
  ];

  const result = await Subscription.aggregate(aggregate);
  return result.length > 0 ? result[0].totalCount : 0;
}

app.get("/user/:id/subscribed", ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    const subscriptions = await Subscription.find({ subscriber: id }).populate(
      "channel"
    );

    const subscribedChannels = subscriptions.map(
      (subscription) => subscription.channel
    );

    const subscribedChannelIds = subscribedChannels.map(
      (channel) => channel._id
    );
    const allVideos = await Video.find({
      owner: { $in: subscribedChannelIds },
    }).populate("owner");

    res.render("pages/subscribed.ejs", {
      req,
      currentUser: req.user,
      subscribedChannels,
      allVideos,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});
app.get(
  "/user/:id/:channelId/videos",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const { id, channelId } = req.params;
      const subscriptions = await Subscription.find({
        subscriber: id,
      }).populate("channel");

      const subscribedChannels = subscriptions.map(
        (subscription) => subscription.channel
      );
      const allVideos = await Video.find({ owner: channelId }).populate(
        "owner"
      );
      const subscribedChannelIds = subscribedChannels.map(
        (channel) => channel._id
      );

      res.render("pages/subscribed.ejs", {
        req,
        currentUser: req.user,
        subscribedChannels,
        allVideos,
        channelId,
      });
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  }
);

//accept request
app.put(
  "/user/:id/requests/:friend/accept",
  ensureAuthenticated,
  async (req, res) => {
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

      const isInWaitingList = user.waiting.some(
        (id) => id.toString() === friendId
      );

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
  }
);

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
      req.flash(
        "error",
        "Friend request already sent or user is already a friend"
      );
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

//search
app.get("/search/:title", ensureAuthenticated, async (req, res) => {
  try {
    const { title } = req.query;
    res.redirect(`/user/${req.user._id}/dashboard/${title}`);
  } catch (err) {
    console.log(err);
  }
});

//dashboard
app.get(
  "/user/:id/dashboard/:username",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const username = req.params.username;
      const profile = await User.findOne({ username });
      if (!profile) {
        return res.status(404).send("User not found");
      }

      const currentuser = await User.findById(req.params.id).populate(
        "waiting"
      );
      const videos = await Video.find({ owner: profile._id }).populate("owner");

      // Check if only user data is requested
      if (req.query.userDataOnly) {
        return res.json({ profile, currentuser });
      }
      const subscription = await Subscription.findOne({
        subscriber: req.user._id,
        channel: profile._id,
      });
      const subscribed = subscription ? true : false;

      // Render the dashboard page with the full layout
      res.render("pages/dashboard.ejs", {
        req,
        user: req.user,
        username,
        videos,
        profile,
        currentuser,
        subscribed,
      });
    } catch (error) {
      console.error("Error retrieving videos:", error);
      res.status(500).send("Error retrieving videos");
    }
  }
);
app.get("/user/:id/edit", ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    res.render("pages/edit.ejs", { req, currentUser: req.user, id, user });
  } catch (error) {
    console.error("Error retrieving video:", error);
    res.status(500).send("Error retrieving video");
  }
});
app.put(
  "/user/:id/edit/profile",
  ensureAuthenticated,
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
  ]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { username, email, category } = req.body;

      let avatarUrl;
      if (req.files["avatar"] && req.files["avatar"].length > 0) {
        const avatarLocalPath = req.files["avatar"][0].path;
        const [avatarResponse] = await Promise.all([
          uploadOnCloudinary(avatarLocalPath),
        ]);

        if (!avatarResponse) {
          throw new Error("Error uploading avatar to Cloudinary.");
        }
        avatarUrl = avatarResponse.secure_url;
      }
      let categoriesArray;
      if (category) {
        categoriesArray = category.split(",").map((item) => item.trim());
      }

      const updatedUser = await User.findByIdAndUpdate(
        id,
        {
          ...(username && { username }),
          ...(email && { email }),
          ...(category && { categories: categoriesArray }),
          ...(avatarUrl && { avatar: avatarUrl }),
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
  }
);

//chat

usp.on("connection", async (socket) => {
  try {
    const userId = socket.handshake.auth.userId;

    await User.findByIdAndUpdate(
      userId,
      { $set: { is_online: true } },
      { new: true }
    );
    usp.emit("user status", { userId, is_online: true });

    socket.join(userId);

    socket.on("disconnect", async () => {
      try {
        await User.findByIdAndUpdate(
          userId,
          { $set: { is_online: false } },
          { new: true }
        );
        usp.emit("user status", { userId, is_online: false });
      } catch (err) {}
    });

    socket.on("existchat", async (data) => {
      try {
        const oldMessages = await Chat.find({
          $or: [
            { sender: data.sender_id, receiver: data.receiver_id },
            { sender: data.receiver_id, receiver: data.sender_id },
          ],
        }).populate("sender receiver");

        const messagesWithUsernames = oldMessages.map((msg) => ({
          _id: msg._id,
          sender_id: msg.sender._id,
          sender_username: msg.sender.username,
          receiver_id: msg.receiver._id,
          receiver_username: msg.receiver.username,
          message: msg.message,
          seen: msg.seen,
          timestamp: msg.timestamp,
        }));

        socket.emit("loadChats", messagesWithUsernames);
      } catch (error) {
        console.error("Error loading existing chat:", error);
      }
    });

    socket.on("new chat message", async (data) => {
      try {
        const { from, to, message, message_id } = data;
        const sender = await User.findById(from);
        const receiver = await User.findById(to);

        const newChatMessage = new Chat({
          sender: from,
          receiver: to,
          message: message,
          seen: false,
        });

        const savedMessage = await newChatMessage.save();

        const messageWithUsernames = {
          from_username: sender.username,
          to_username: receiver.username,
          message: message,
          timestamp: savedMessage.timestamp,
          message_id: savedMessage._id,
          sender_id: sender._id,
          receiver_id: receiver._id,
        };

        socket.to(to).emit("chat message", messageWithUsernames);
        socket.emit("chat message", messageWithUsernames);

        usp.to(to).emit("new message notification", {
          from_username: sender.username,
        });
      } catch (error) {
        console.error("Error saving or emitting new chat message:", error);
      }
    });
  } catch (err) {}
});

//search chat
app.get("/user/:userId/search/chat", ensureAuthenticated, async (req, res) => {
  try {
    const searchTerm = req.query.title;
    const userId = req.user._id;

    const matchedUsers = await User.find({
      username: { $regex: new RegExp(searchTerm, "i") },
    });

    const currentUser = await User.findById(userId).populate("friends");

    const friends = matchedUsers.filter((user) =>
      currentUser.friends.some((friend) => friend._id.equals(user._id))
    );
    const nonFriends = matchedUsers.filter(
      (user) =>
        !currentUser.friends.some((friend) => friend._id.equals(user._id))
    );
    const alluser = await User.find({ _id: { $ne: userId } });
    const user = await User.findById(userId);
    const waitingUsers = [];
    for (const requestID of user.waiting) {
      const requestUser = await User.findById(requestID);
      if (requestUser) {
        waitingUsers.push(requestUser);
      }
    }
    res.render("pages/allchat.ejs", {
      alluser,
      req,
      friends,
      nonFriends,
      waitingUsers,
      currentUser: req.user,
      chatUser: null,
      chatHistory: [],
      searchPerformed: true,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/:id/chat/all", ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user._id;
    const alluser = await User.find({ _id: { $ne: userId } });
    res.render("pages/allchat.ejs", { req, currentUser: req.user, alluser });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
  }
});
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
          $or: [{ sender: userId }, { receiver: userId }],
        },
      },
      {
        $group: {
          _id: null,
          users: {
            $addToSet: {
              $cond: [{ $eq: ["$sender", userId] }, "$receiver", "$sender"],
            },
          },
        },
      },
    ]);

    const chatUserIDs =
      usersWithChatHistory.length > 0 ? usersWithChatHistory[0].users : [];
    const currentUser = await User.findById(userId).populate("openedChats");
    const allFriends = await User.find({ _id: { $in: currentUser.friends } });

    const unseenMessages = await Chat.find({ receiver: userId, seen: false });

    const friendsWithChat = allFriends.map((friend) => {
      const hasUnseenMessages =
        unseenMessages.some(
          (msg) => msg.sender.toString() === friend._id.toString()
        ) &&
        !currentUser.openedChats.some(
          (chat) => chat._id.toString() === friend._id.toString()
        );
      return { ...friend.toObject(), hasUnseenMessages };
    });

    const user = await User.findById(userId);
    const waitingUsers = [];
    for (const requestID of user.waiting) {
      const requestUser = await User.findById(requestID);
      if (requestUser) {
        waitingUsers.push(requestUser);
      }
    }
    res.render("pages/chat.ejs", {
      req,
      currentUser: req.user,
      userchat: friendsWithChat,
      waitingUsers,
    });
  } catch (error) {
    console.error("Error fetching chat users:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.post(
  "/user/:receiverId/chat/mark-opened",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const receiverId = req.params.receiverId;
      const userId = req.user._id;

      await User.findByIdAndUpdate(userId, {
        $addToSet: { openedChats: receiverId },
      });

      res.status(200).send("Chat marked as opened");
    } catch (error) {
      console.error("Error marking chat as opened:", error);
      res.status(500).send("Error marking chat as opened");
    }
  }
);

app.post("/user/:receiver_id/chat/delete-message", async (req, res) => {
  const { messageId } = req.body;
  console.log(messageId, "messageId");
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid message ID" });
  }
  try {
    const result = await Chat.findByIdAndDelete(messageId);
    if (result) {
      res.json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "Message not found" });
    }
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.post(
  "/user/:id/chat/save-message",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const chat = new Chat({
        sender: req.user._id,
        receiver: req.params.id,
        message: req.body.message,
        seen: false,
      });

      res
        .status(200)
        .json({ success: true, message: "Message saved successfully", chat });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Failed to save message" });
    }
  }
);

app.post(
  "/user/:receiver_id/:sender_id/chat/mark-seen",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const { receiver_id, sender_id } = req.params;
      await Chat.updateMany(
        {
          sender: receiver_id,
          receiver: sender_id,
          seen: false,
        },
        {
          $set: { seen: true },
        }
      );

      res
        .status(200)
        .json({ success: true, message: "Messages marked as seen" });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Failed to mark messages as seen" });
    }
  }
);

app.post(
  "/user/:id/videos/:video/comments",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const { content } = req.body;
      console.log(req.body);
      const { id, video } = req.params;
      const newComment = await Comment.create({
        content,
        video,
        owner: id,
      });
      console.log("Comment added:", newComment);
      res.redirect(`/user/${req.user._id}/videos/${req.params.video}`);
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).send("Error adding comment");
    }
  }
);

//likes comment
app.post(
  "/user/:id/videos/:video/comments/:commentId/like",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const { id, video, commentId } = req.params;

      const liked = await Comment.findOneAndUpdate(
        { _id: commentId },
        { $addToSet: { likes: id } },
        { new: true }
      ).populate("owner");

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
  }
);
app.post(
  "/user/:id/videos/:video/comments/:commentId/unlike",
  ensureAuthenticated,
  async (req, res) => {
    try {
      const { id, video, commentId } = req.params;

      const liked = await Comment.findOneAndUpdate(
        { _id: commentId },
        { $pull: { likes: id } },
        { new: true }
      ).populate("owner");

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
  }
);

const Like = require("./models/like.js");
const comment = require("./models/comment.js");
//like video
app.post("/toggle/v/:videoId", ensureAuthenticated, async (req, res) => {
  const { videoId } = req.params;

  try {
    const video = await Video.findById(videoId);

    if (!video) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found or not published" });
    }

    const userAlreadyLiked = await Like.findOne({
      video: videoId,
      likedBy: req.user._id,
    });

    if (userAlreadyLiked) {
      await Like.deleteOne({ _id: userAlreadyLiked._id });
    } else {
      const likeVideo = await Like.create({
        video: videoId,
        likedBy: req.user._id,
      });

      if (!likeVideo) {
        return res
          .status(400)
          .json({ success: false, message: "Unable to like the video" });
      }
    }

    const likesCount = await Like.countDocuments({ video: videoId });
    return res.json({ success: true, likesCount });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ success: false, message: "An error occurred" });
  }
});

// app.get('/user/:id/liked', ensureAuthenticated, async (req, res) => {
//   try {
//     const aggregate = [
//       {
//         $match: {
//           likedBy: new mongoose.Types.ObjectId(req.user?._id)
//         }
//       }, {
//         $lookup: {
//           from: "Video",
//           localField: "video",
//           foreignField: "_id",
//           as: "likedVideos"
//         }
//       }, {
//         $unwind: {
//           path: "$likedVideos",
//         }
//       }, {
//         $project: {
//           likedVideo: 1
//         }
//       }
//     ]

//     const likedVideo = await Like.aggregate(aggregate)

//     if (!likedVideo) {
//       throw new error(400, "Liked Video not founded")
//     }
//     console.log(likedVideo);
//     res.render('pages/watch.ejs', { req, user: req.user, allVideos:likedVideo })
//   } catch (error) {
//     console.error(error)
//   }
// })

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/auth/google/success",
    failureRedirect: "/auth/google/failure",
  })
);

app.get("/auth/google/success", (req, res) => {
  console.log(req.user);
  req.flash("success", "Authenticated with Google succes sfully!");
  res.redirect(`/user/${req.user._id}`);
});

app.get("/auth/google/failure", (req, res) => {
  req.flash("error", "Failed to authenticate with Google. Please try again.");
  res.redirect("/signup");
});

const PORT = 5000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
