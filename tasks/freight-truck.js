module.exports = function  (grunt) {

  'use strict';

  var fs = require('fs');
  var async = require('async');
  var path = require('path');
  var knox = require('knox');
  var crypto = require('crypto');
  var options, uploader;
  var pathsMap = {};

  require('colors');

  function hashAndUpload (name, callback) {

    var baseDir = options.baseDir;
    var filePath = path.join(baseDir, name);

    createSha1(filePath, function () {

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

    var fileStream = fs.ReadStream(path);
    var remotePath = '';
  }

  grunt.registerMultiTask('freight-truck', function () {

    grunt.log.writeln(JSON.stringify(this.data))

    var done = this.async();
    var data = this.data;
    options = this.options({
      'cdn': {
        'bucket': '',
        'key': '',
        'secret': ''
      }
    });
    console.log(options)
    uploader = knox.createClient(options.cdn);

    pathsMap = {};

    async.forEach(data.target, hashAndUpload, function () {

      grunt.file.write('paths.json', JSON.stringify(pathsMap, null, 2), function (error) {

        if (err) {
          throw err;
        }

        done();
      });
    });
  });
};