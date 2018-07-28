var multer = require('multer');
var crypto = require('crypto');

var storage = multer.diskStorage({

  destination: function (req, file, cb) {
    cb(null, './private/upload');
   }, 

  filename: function (req, file, cb) {
    var shasum = crypto.createHash('sha1');
    shasum.update(file.originalname + '-' + Date.now());
    cb(null, shasum.digest('hex') + ".upload");
  }

}); 

var upload = multer({
  storage: storage,
  limits: { fileSize: 1000000 }
});
    
module.exports = upload;