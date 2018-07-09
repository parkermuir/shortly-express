var express = require("express");
var util = require("./lib/utility");
var partials = require("express-partials");
var bodyParser = require("body-parser");
var session = require('express-session')

var db = require("./app/config");
var Users = require("./app/collections/users");
var User = require("./app/models/user");
var Links = require("./app/collections/links");
var Link = require("./app/models/link");
var Click = require("./app/models/click");
var bcrypt = require('bcrypt-nodejs')

var app = express();

var hashPwd = function(pwd, cb){
  bcrypt.hash(pwd, null, null, function(err, hash) {
    if (err) throw err 
    else { 
    cb(hash)
    }
  });
}

var restrict = function (req, res, next) {
  if (req.session.user){
    next()
  } else {
    req.session.error = 'Access Denied!!!!!!!';
    res.redirect('/signup')
  }
}

app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public"));
app.use(session({secret: 'this-is-a-secret-token', cookie: {maxAge: 60000} })) // NEW

app.get("/", restrict, function(req, res) {
  res.render("index");
});

app.get("/create", restrict, function(req, res) {
  res.render("index");
});

app.get("/links", restrict, function(req, res) {
  Links.reset()
    .fetch()
    .then(function(links) {
      res.status(200).send(links.models);
    });
});

app.post("/links", restrict, function(req, res) {
  var uri = req.body.url;
  console.log('URI IS ', uri)
  if (!util.isValidUrl(uri)) {
    console.log("Not a valid url: ", uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log("Error reading URL heading: ", err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        }).then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get("/login", function(req, res) {
  res.render("login");
});

app.post("/login", function(req, res) {
  if (!req.body) return res.sendStatus(400);
  let name = req.body.username;
  let password = req.body.password;
  new User({ name: name }).fetch().then(
    function(found) {
    if (found) {
      let dbUser = found.attributes.name;
      let dbHash = found.attributes.hash;
      bcrypt.compare(password, dbHash, (err, rs) => {
        if (err) throw 'aaaaa'
        if (rs === true) {
          req.session.regenerate( () => {
            req.session.user = name;
            console.error('REQUEST SESSION IS: ', req.session);
            res.redirect("/");
          })
        } else if (rs === false) {
          console.error("AAAAA")
          res.redirect('/login')
        }
      })
    } else {
      res.status(404).send('USER NOT FOUND')
    }
  });
});

app.get("/signup", function(req, res) {
  res.render("signup");
});

app.post("/signup", function(req, res) {
  if (!req.body) return res.sendStatus(400);
  let name = req.body.username;
  let password = req.body.password; 
  let pwd = hashPwd(req.body.password, (hashedPassword) => {
    new User({ name: name, hash: hashedPassword }).fetch().then(function(found) {
    if (found) {
      res.status(200).send("Logged in!");
    } else {
      Users.create({
        name: name,
        hash: hashedPassword
      }).then(function(newUser) {
        res.status(200).send(`User ${newUser.attributes.name} created!`);
      });
    }
  });
  });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get("/*", restrict, function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect("/");
    } else {
      var click = new Click({
        linkId: link.get("id")
      });

      click.save().then(function() {
        link.set("visits", link.get("visits") + 1);
        link.save().then(function() {
          return res.redirect(link.get("url"));
        });
      });
    }
  });
});

module.exports = app;
