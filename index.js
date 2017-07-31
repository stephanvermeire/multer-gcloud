const stream = require('stream')
const fileType = require('file-type')
const parallel = require('run-parallel')
const fs = require('fs');

function staticValue (value) {
  return function (req, file, cb) {
    cb(null, value)
  }
}

var defaultContentType = staticValue('application/octet-stream')

function autoContentType (req, file, cb) {
  file.stream.once('data', function (firstChunk) {
    var type = fileType(firstChunk)
    var mime = (type === null ? 'application/octet-stream' : type.mime)
    var outStream = new stream.PassThrough()

    outStream.write(firstChunk)
    file.stream.pipe(outStream)

    cb(null, mime, outStream)
  })
}

function collect (storage, req, file, cb) {
  parallel([
    storage.getDestination.bind(storage, req, file),
    storage.getFilename.bind(storage, req, file),
    storage.getStorageBucket.bind(storage, req, file)
  ], function (err, values) {
    if (err) return cb(err)

    cb.call(storage, null, {
      destination: values[0],
      filename: values[1],
      storage_bucket: values[2],
    })
  })
}

function GcloudStorage (opts) {
  switch (typeof opts.bucket) {
    case 'object': this.bucket = opts.bucket; break
    default: throw new TypeError('Expected opts.bucket to be object')
  }

  switch (typeof opts.storage_bucket) {
    case 'string': this.getStorageBucket = staticValue(opts.storage_bucket); break
    default: throw new TypeError('Expected opts.storage_bucket to be string')
  }

  switch (typeof opts.destination) {
    case 'function': this.getDestination = opts.destination; break
    case 'string': this.getDestination = staticValue(opts.destination); break
    case 'undefined': throw new Error('destination is required')
    default: throw new TypeError('Expected opts.destination to be undefined, string or function')
  }

  switch (typeof opts.filename) {
    case 'function': this.getFilename = opts.filename; break
    case 'string': this.getFilename = staticValue(opts.filename); break
    case 'undefined': throw new Error('filename is required')
    default: throw new TypeError('Expected opts.filename to be undefined, string or function')
  }
}

GcloudStorage.prototype._handleFile = function (req, file, cb) {
  collect(this, req, file, function (err, opts) {
    if (err) return cb(err)

    function getPublicUrl(storageName) {
      const = urlBase = `https://firebasestorage.googleapis.com`;
      return `${urlBase}/v0/b/platzigram-151d3.appspot.com/o/${encodeURIComponent(storageName)}?alt=media`;
    }

    const uploadTo = `${opts.destination}/${opts.filename}`
    const localReadStream = file.stream;
    const file_bucket = this.bucket.file(uploadTo)
    const stream = file_bucket.createWriteStream({
      metadata: {
        contentType: file.mimetype
      }
    });

    stream.on('error', (err) => {
      cb(err);
    });

    localReadStream.pipe(stream);

    stream.on('finish', () => {
      publicUrl = getPublicUrl(uploadTo);

      cb(null, {
        bucket: this.bucket,
        contentType: opts.contentType,
        metadata: file,
        location: getPublicUrl(uploadTo)
      });
    });
  })
}

GcloudStorage.prototype._removeFile = function (req, file, cb) {
  // crear method delete
}

module.exports = function (opts) {
  return new GcloudStorage(opts)
}

module.exports.AUTO_CONTENT_TYPE = autoContentType
module.exports.DEFAULT_CONTENT_TYPE = defaultContentType
