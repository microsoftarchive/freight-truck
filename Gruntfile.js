module.exports = function (grunt) {

  'use strict';

  grunt.loadTasks('tasks');

  var config = grunt.file.readJSON('sample.json');

  grunt.initConfig(config);

  grunt.registerTask('default', ['freight-truck']);
};