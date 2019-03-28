'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var mongodb = require('mongodb').MongoClient;
mongoose.connect(process.env.MONGO_URL, {autoIndex: false});

var cors = require('cors');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
// mongoose.connect(process.env.MONGOLAB_URI);
var Schema = mongoose.Schema;
var UrlSchema  = new Schema({
  original_url: String, 
  short_url: String
});
var Url = mongoose.model('Url',UrlSchema);

var url = new Url({
  original_url: "https://www.google.com",
  short_url: "1"
});

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here

app.use(bodyParser.urlencoded({extended: 'false'}));
app.use(bodyParser.json());

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});

var isUrlValid = function isUrlValid(userInput) {
    var res = userInput.match(/^(http(s)?:\/\/www\.)[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
    if(res == null)
        return false;
    else
        return true;
}

var findByShortUrl = function(shortUrl, done){
Url.findOne({short_url: shortUrl},(err,data)=>{
  done(data);
  });
}

var findByFullUrl = function(fullUrl, done){
Url.findOne({original_url: fullUrl},(err,data)=>{
  done(data);
});
}

app.get("/api/shorturl/:url",(req,res)=>{
  var errorObject = {
    "error":"No short url found for given input"
  }; 
  Url.find({short_url: req.params['url']},(err,data)=>{
    if(data == null){
      res.json(errorObject);
    }
    res.json(data);
  });
});

var findLastShortUrl = function(){
  var short_url= Url.findOne({})
    .sort({short_url: -1})
    .limit(1)
    .select('short_url');
  return short_url;
};

app.post("/api/shorturl/new",(req,res)=>{
  var url = req.body['url'];
  var errorObj = {"error":"invalid URL"};
  if(isUrlValid(url)){
    findByFullUrl(url,(result)=>{
      if(result == null){
        findLastShortUrl().then((result)=>{
          var nextShortUrl = parseInt(result.short_url) + 1;
          var newUrl = new Url({
            original_url: url,
            short_url: nextShortUrl
          }); 
        newUrl.save()
          res.send(
            {"original_url":newUrl.original_url,
             "short_url":newUrl.short_url
            });
        });
      }
      else
      {
        res.send(
              {"original_url":result.original_url,
               "short_url":result.short_url
              });
      }
    });
  //   var shortenUrl = new Url({
  //     original_url: req.body['url'],
  //     short_url: findLastShortUrl()
  //   });  
  //   shortenUrl.save();
  //   res.json(shortenUrl);
  console.log("valid url");
  }
  else{
    res.json(errorObj);
  }
});

app.listen(port, function () {
  console.log('Node.js listening ...');
});