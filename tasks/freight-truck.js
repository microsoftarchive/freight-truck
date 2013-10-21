/*globals require*/
module.exports = function  (grunt) {

  'use strict';

  var fs = require('fs');
  var path = require('path');
  var url = require("url")

  require('colors');
  var knox = require('knox');
  var crypto = require('crypto');
  var mime = require('mime');

  var async = grunt.util.async;

  var uploader;
  var options;

  var remotePathsMap;
  var retryCountMap = {};

  function calculateSha1(file, callback) {

    var shasum = crypto.createHash('sha1');
    var fileStream = fs.ReadStream(file);
    fileStream.on('data', shasum.update.bind(shasum));

    fileStream.on('error', function(err) {
      grunt.log.error('error reading stream', file, err);
      grunt.fatal('error reading file', file);
    });

    fileStream.on('end', function() {
      // give the stream some time to cleanup, just in case
      process.nextTick(function () {
        callback(null, shasum.digest('hex'));
      });
    });
  }

  function uploadFile(name, filePath, sha1, callback) {

    var fileStats = fs.statSync(filePath);
    var fileStream = fs.ReadStream(filePath);
    var fileName;

    // if we use the same folder structure then set the just use the name as fileName
    if (options.useLocalFolderStructure) {
      fileName = name;
    }
    // otherwise use the file in the flat sha1 folder
    else {
      fileName = url.parse(name).pathname;
      fileName = fileName.substring(fileName.lastIndexOf('/') + 1);
    }

    var remotePath = options.remotePath + sha1 + '/' + fileName;
    var headers = {
      'Content-Type': mime.lookup(name),
      'Content-Length': fileStats.size,
      'x-amz-acl': 'public-read'
    };

    var fileStatSync = fs.lstatSync(filePath);
    if (fileStatSync.isSymbolicLink() && !fileStatSync.isFile()) {
      filePath = path.resolve(path.dirname(filePath), fs.readlinkSync(filePath));
      grunt.log.writeln('[SKIPPED]'.grey, '\u2713'.grey, fileName);
      callback();
    }

    // upload the file stream
    uploader.putStream(fileStream, remotePath, headers, function (err, response) {

      // break if any upload fails
      if (err || response.statusCode !== 200) {
        grunt.log.error('error uploading', fileName, '\t trying again in a second');

        // stop if already tried 3 times
        var retryCount = retryCountMap[fileName] || 0;
        if (retryCount > 3) {
          grunt.log.error('failed at uploading', fileName, 'after 3 attempts');
          grunt.fatal();
        }

        // try again in a second
        setTimeout(function() {

          retryCountMap[fileName] = retryCount + 1;
          uploadFile(name, filePath, sha1, callback);
        }, 1000);
        return;
      }
      else {

        grunt.log.writeln('[UPLOAD]'.yellow, '\u2713'.green, fileName);

        // save the remote path for the build
        remotePathsMap[fileName] = remotePath;

        // throttle the upload a bit
        setTimeout(callback, 200);
      }
    });
  }

  function hashAndUploadFile(name, callback) {

    var baseDir = options.baseDir;
    // make path absolute
    var filePath = path.join(baseDir, name);

    // calculate sha1 for prefixing
    calculateSha1(filePath, function(err, sha1) {
      uploadFile(name, filePath, sha1, callback);
    });
  }

  grunt.registerTask('freight-truck', function () {

    var done = this.async();

    options = this.options({
      'cdn': {
        'bucket': '',
        'key': '',
        'secret': ''
      }
    });

    uploader = knox.createClient(options.cdn);

    // Clear out the remote path map
    remotePathsMap = {};

    // start uploading
    // investigate if we should do this syncronously
    async.forEachLimit(options.files, 30, hashAndUploadFile, function () {

      // Dump the URL map to a file
      grunt.file.write('paths.json', JSON.stringify(remotePathsMap, null, 2), function (err) {

        if(err) {
          throw err;
        }

        done();
      });
    });
  });
};