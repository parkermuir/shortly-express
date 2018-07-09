var db = require("../config");
var bcrypt = require("bcrypt-nodejs");
var Promise = require("bluebird");

//Synchronous

// var hash = bcrypt.hashSync("bacon");

// bcrypt.compareSync("bacon", hash); // true
// bcrypt.compareSync("veggies", hash); // false
// Asynchronous

// bcrypt.hash("bacon", null, null, function(err, hash) {
//     // Store hash in your password DB.
// });

// // Load hash from your password DB.
// bcrypt.compare("bacon", hash, function(err, res) {
//     // res == true
// });
// bcrypt.compare("veggies", hash, function(err, res) {
//     // res = false
// });

var User = db.Model.extend({
  tableName: "users",
  hasTimestamps: true,
  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      let pwd = model.attributes.password;
      let obj = model.attributes;
      bcrypt.hash(pwd, null, null, function(err, hash) {
        if (err) throw err
        else {
        obj.hash = hash;
        model.set(obj);
        }
      });
    });
  },
  // auth: function(userObj){
  //   model.get()
  // }
});

module.exports = User;

var hash = bcrypt.hashSync("howkjenkjnrly");
