# multer-gcloud

A storage module for connect gcloud with multer

## Install
```sh
    $ npm install --save multer-gcloud
```


## Config
```js
var multer_gcloud = require('multer-gcloud');

var gcloud = require('@google-cloud/storage')({
  projectId: '<projectId>',
  keyFilename: '<google-cloud-service.json>'
});

var bucket = gcloud.bucket('<storageBucket>');

const storage = multer_gcloud({
  storage_bucket: '<storageBucket>',
  bucket: bucket,
  metadata: function (req, file, cb) {
    cb(null, file.mimetype);
  },
  destination: function (req, file, cb) {
    cb(null, 'uploads');
  },
  filename: function (req, file, cb) {
    cb(null, + Date.now() + '.' + ext(file.originalname));
  }
});

const upload = multer({ storage: storage }).single('picture');
```
