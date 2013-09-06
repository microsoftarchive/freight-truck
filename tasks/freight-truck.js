module.exports = function (grunt) {

  'use strict';

  var fs = require('fs');
  var async = require('async');
  var path = require('path');
  var knox = require('knox');
  var crypto = require('crypto');
  var mime = require('mime');

  var options, uploader, data, cdnUrl;
  var pathsMap = {};

  require('colors');

  function hashAndUpload (name, callback) {

    var baseDir = data.baseDir;
    var filePath = path.join(baseDir, name);

    createSha1(filePath, function (err, sha1) {

      upload(name, filePath, sha1, callback);
    });
  }

  function createSha1 (file, callback) {

    var shasum = crypto.createHash('sha1');
    var fileStream = fs.ReadStream(file);
    fileStream.on('data', shasum.update.bind(shasum));

    fileStream.on('error', function(err) {

      grunt.log.error('error reading stream'.red, file, err);
      grunt.fatal('error reading file'.red, file);
    });

    fileStream.on('end', function() {
      // give the stream some time to cleanup, just in case
      process.nextTick(function () {

        callback(null, shasum.digest('hex'));
      });
    });
  }

  function upload (name, path, sha1, callback) {

    var fileStats = fs.statSync(path);
    var fileStream = fs.ReadStream(path);
    var remotePath = cdnUrl + '/' + data.prefix + '/' + sha1 + '/' + name;

    var headers = {
      'Content-Type': mime.lookup(name),
      'Content-Length': fileStats.size,
      'x-amz-acl': 'public-read'
    };

    // upload the file stream
    // uploader.putStream(fileStream, remotePath, headers, function (err, response) {

      // // break if any upload fails
      // if (err || response.statusCode !== 200) {
      //   grunt.log.error('error uploading', name, '\t trying again in a second');

      //   // stop if already tried 3 times
      //   var retryCount = retryCountMap[name] || 0;
      //   if (retryCount > 3) {
      //     grunt.log.error('failed at uploading', name, 'after 3 attempts');
      //     grunt.fatal();
      //   }

      //   // try again in a second
      //   setTimeout(function() {

      //     retryCountMap[name] = retryCount + 1;
      //     uploadFile(name, filePath, sha1, callback);
      //   }, 1000);
      //   return;
      // }
      // else {

        var previousPaths = grunt.file.readJSON('paths.json');
       // console.log(previousPaths[name][1] , sha1)
        grunt.log.writeln('[UPLOAD]'.yellow, '\u2713'.green, name);

        // save the remote path for the build
        pathsMap[name] = [remotePath, sha1];

        callback();
        // throttle the upload a bit
      //   setTimeout(callback, 500);
      // }
    // });
  }

  grunt.registerMultiTask('freight-truck', function () {

    var done = this.async();
    data = this.data;
    options = this.options({
      'cdn': {
        'bucket': '',
        'key': '',
        'secret': ''
      }
    });

    cdnUrl = '//' + options.cdn.bucket + '.s3.amazonaws.com';
    uploader = knox.createClient(options.cdn);
    pathsMap = {};

    var baseDir = path.resolve(data.baseDir);

    async.map(data.glob, function (pattern, callback) {

      grunt.file.glob(pattern, {
        'cwd': baseDir
      }, function (err, files) {
        if (err) {
          return callback(err);
        }
        callback(null, files);
      });
    }, function (err, files) {

      var merged = [];
      while (files.length) {
        merged.push.apply(merged, files.pop());
      }

      merged.length && merged.forEach(function (file) {

        hashAndUpload(file, function () {

          grunt.file.write('paths.json', JSON.stringify(pathsMap, null, 2), function (error) {

            if (err) {
              throw err;
            }
          });
        });
      });

      done();
    });
  });
};