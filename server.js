const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const {Schema} = require("mongoose");

//#region server setup
const port = process.env.PORT || 3000;

//allow cors to pass FCC tests
app.use(cors());
//serve static §files (for css)
app.use('/', express.static(`${process.cwd()}/public`));
//add the body parser middleware for parsing POST requests' body
app.use(bodyParser.urlencoded({extended:true}))

//#endregion

//#region DB Setup

//DB connection
mongoose.connect(  process.env.MONGO_URI, {}, (err) => {
  if(err){
    console.log(err)
    process.exit(1)
  }
})

//Creating schemas for the DB interaction:
const ExerciseSchema = new Schema({
    username: String,
    description: String,
    duration: Number,
    date: Date,
},{
    versionKey: false,
    toJSON:{
        transform: (doc, ret, options) => {
            const output = Object.assign(ret)
            output.date = new Date(output.date).toDateString()
            return output
        }
    }
});

const UserSchema = new Schema({
    username: String,
},{versionKey: false});

const Exercise = mongoose.model('exercise', ExerciseSchema);
const User = mongoose.model('user', UserSchema);
//#endregion

//#region routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', async (req, res) => {
    res.json(await User.find())
})
app.post('/api/users', (async (req, res) => {
    const username = req.body.username
    //get the existing user with that username or create a new one
    const user = await User.findOne({username}).exec() ?? await User.create({username})
    res.json(user)
}))

app.post('/api/users/:_id/exercises', (async (req, res) => {
    //user stuff
    const user = await User.findById(req.params._id).exec()
    if(user == null){
        res.json({error:'Unknown user'})
    }
    const username = user.username

    //exercise stuff
    const description = req.body.description;
    const duration = req.body.duration;
    const date = new Date(req.body.date ?? null)

    //creating the exercise
    let exercise = await Exercise.create({
        username,
        description,
        duration,
        date,
    })

    res.json(Object.assign(user.toJSON(), exercise.toJSON()))
}))

app.get('/api/users/:_id/logs', async (req, res) => {
    //user stuff
    const user = await User.findById(req.params._id).exec()
    if(user == null){
        res.json({error:'Unknown user'})
    }
    const username = user.username

    //GET PARAMS
    const {from, to, limit} = req.query

    //creating the query for getting the right exercises
    let query = Exercise.find({username}).select("-username -_id")

    if(from)    query = query.find({date: {$gte: new Date(from)}})
    if(to)      query = query.find({date: {$lte: new Date(to)}})
    if(limit)   query = query.limit(parseInt(req.query.limit, 10))

    const exercises = await query.exec()

    res.json(Object.assign(user.toJSON(), {
        count: exercises.length,
        log: exercises
    }))

})


//#endregion


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
