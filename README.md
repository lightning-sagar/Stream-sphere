# TechSphere

![image](https://github.com/user-attachments/assets/a539818f-717c-4f27-8145-63fff7475389)

![image](https://github.com/user-attachments/assets/57c8b763-3ca7-4fc1-a35c-569feaeaccfb)

**TechSphere** is a cutting-edge tech community platform, designed as a social media platform specifically for tech enthusiasts. It was developed during the **RideHack Hackathon (JIIT Noida)** and successfully made it to the final round!

This platform enables users to:
- Upload and share tech-related videos.
- Post tweets and share thoughts.
- Engage in real-time chats.

It leverages modern web technologies to deliver a seamless experience and integrates a recommendation model for personalized user experiences.

## Features

1. **Video Uploads**:
   - Users can upload tech videos with metadata stored in the database.
   - Videos and images are securely stored and served using **Cloudinary**.

2. **Tech Tweets**:
   - Share tweets or posts with the community.

3. **Real-Time Chat**:
   - Powered by **Socket.io**, users can communicate in real-time.

4. **AI-Based Recommendations**:
   - Integrated a Machine Learning model for personalized recommendations.
   - Recommendation model hosted on GitHub: [TechSphere-ML](https://github.com/lightning-sagar/Stream-sphere-ML).
   - Integrated the ML model using **FastAPI**, exposing endpoints for seamless functionality.

## Tech Stack

- **Frontend**: EJS (Embedded JavaScript Templates)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Real-Time Communication**: Socket.io
- **Cloud Storage**: Cloudinary
- **ML Integration**: FastAPI

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/TechSphere.git
   ```
2. Navigate to the project directory:
   ```bash
   cd TechSphere
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   npm start
   ```

## Usage

- Access the platform at `http://localhost:3000` (depending on your PORT).
- Register as a user to upload videos, post tweets, and chat with others.

## Contribution

We welcome contributions! Feel free to fork this repository, make changes, and submit a pull request.

---

### Acknowledgments

- Developed as part of the **RideHack Hackathon**.
- Special thanks to the mentors and organizers for their guidance.

**Happy Coding!**
