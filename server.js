const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

var Schema = mongoose.Schema;
var exerciseSchema = new Schema({
  userId : String,
  description: String,
  duration: Number, 
  date: Date,
});
var userSchema = new Schema({
  name: String,
  id: String,
});
var User = mongoose.model('User',userSchema);
var Exercise = mongoose.model('Exercise',exerciseSchema);

//hello api
app.get("/api/hello", function (req, res) {
  var exercise = new Exercise({
    userId: 'asdfv',
    description: 'person exercising',
    duration: 123,
    date:Date.now(),
  });
  var user = new User({
    name: 'abhi',
    log:[exercise],
  });
  user.save((err,data)=>{
    res.json(data);  
  });
});

//create new user
app.post("/api/exercise/new-user",(req, res)=>{
  var userName = req.body['username'];
  var user = new User({
    name: userName,
    id: generateID(),
  });
  user.save((err,data)=>{
    console.log(data,err);
    if(err && err.code == '11000'){
        res.send("username already taken");
    }
    else{
      res.json({username: data.name, _id: data.id});  
    }
  });
});


//create new exercise
app.post("/api/exercise/add",(req, res)=>{
  var userId = req.body['userId'];
  var description = req.body['description'];
  var duration, date;
  duration = parseInt(req.body['duration'],10);
  date = Date.parse(req.body['date']);
  const dateError = 'Cast to Date failed for value "'+req.body['date']+'" at path "date"';
  const durationError = 'Cast to Number failed for value "'+req.body['duration']+'" at path "duration"';
  console.log(userId + description + duration + date);
  if(!date){
    res.send(dateError);
  }
  else if(!duration){
    res.send(durationError);
  }
  else{
    var newExercise = new Exercise({
      userId: userId, 
      description: description,
      duration: duration,
      date: date
    });
    User.findOne({id: userId},(err, user)=>{
      console.log(err,user);
      if(user == null){
        res.send("unknown _id");
      }
      else{
        newExercise.save((err,data)=>{
          var options = {  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'};
          var prnDt = new Date(date).toLocaleTimeString('en-us', options);
          res.json({
            username: user.name,
            description: description,
            duration: duration,
            _id: userId,
            date: prnDt,
          });
        });
      }
    });
  }
});

const generateID = ()=>{
return Math.random().toString(36).slice(-9);  
};
const parseDate = (str) => {
    if(!/^(\d){8}$/.test(str)) throw('dateError');
    var y = str.substr(0,4),
        m = str.substr(4,2) - 1,
        d = str.substr(6,2);
    return new Date(y,m,d);
}


//fetch exercise
app.get("/api/exercise/log",(req,res)=>{
  console.log("get call recieved.");
  var userId = req.query['userId'];
  var from = req.query['from'];
  var to = req.query['to'];
  var limit = parseInt(req.query['limit']);
  console.log(userId+ " "+ from + " " + to + " "+  limit);
  var dateQuery = {};
  var query = {};
  
  if(userId){
    query['userId'] = userId; 
  }
  else{
    res.send('unknown userId');
  }
  if(from || to){
    if(from){
      console.log("from: ",from);
      dateQuery["$gte"] = new Date(from);
    }
    if(to){
      console.log("to: ",to);
      dateQuery["$lte"] = new Date(to);
    }
    query["date"] = dateQuery;
  }
  console.log("datequery: "+dateQuery);
  User.findOne({id: userId},(error, user)=>{
    if(user == null){
      res.send('unknown userId');
    }
    else{
      var response = {};
      response['_id']=user.id
      response['username']=user.name
      if(from){
        response['from'] = from;
      }
      if(to){
        response['to'] = to;
      }
      //res.json(response);
      var exercises = Exercise.find(query).limit(limit);
      exercises.exec((err,data)=>{
        response['count']=data.length;
        response['logs'] = data.map(ex =>{
          return ({
            description: ex.description,
            duration: ex.duration,
            date: ex.date
          });
        });
        res.json(response);
      });
    }
    // var exercises = Exercise.find(query).limit(limit);
    // exercises.exec((err,data)=>{
    // res.json({err:err,data:data});
  });    
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
});



// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
