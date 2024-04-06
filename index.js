require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to database'))
  .catch(error => console.error('Database connection error:', error));

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    unique: true
  }
}, { versionKey: false });

const exerciseSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date,
  userId: mongoose.Schema.Types.ObjectId
}, { versionKey: false });

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    let user = await User.findOne({ username });
    if (user) {
      res.json(user);
    } else {
      user = await User.create({ username });
      res.json(user);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const { description, duration, date } = req.body;
    const userId = req.params._id;
    const foundUser = await User.findById(userId);
    if (!foundUser) {
      return res.status(404).json({ message: "No user exists for that id" });
    }
    const newExercise = await Exercise.create({
      username: foundUser.username,
      description,
      duration,
      date: date ? new Date(date) : new Date(),
      userId
    });
    res.json(newExercise);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { from, to, limit } = req.query;
    const userId = req.params._id;
    const foundUser = await User.findById(userId);
    if (!foundUser) {
      return res.status(404).json({ message: "No user exists for that id" });
    }
    let filter = { userId };
    if (from || to) {
      filter.date = {};
      if (from) {
        filter.date.$gte = new Date(from);
      }
      if (to) {
        filter.date.$lte = new Date(to);
      }
    }
    let exercisesQuery = Exercise.find(filter);
    if (limit) {
      exercisesQuery = exercisesQuery.limit(parseInt(limit));
    }
    const exercises = await exercisesQuery.exec();
    const formattedExercises = exercises.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    }));
    res.json({
      username: foundUser.username,
      count: formattedExercises.length,
      _id: userId,
      log: formattedExercises
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
