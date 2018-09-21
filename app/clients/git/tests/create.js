describe("create", function() {

  var create = require('../create');
  var clone = require('./util/clone');
  var localPath = require('helper').localPath;

  it("fails when there is an existing repo in the blog's folder", function(done) {

    var Git = require("simple-git");

    Git = Git(localPath(global.blog.id,'/')).silent(true);
    
    Git.init(function(err){

      expect(err).toEqual(null);

      create(global.blog, function(err){
        
        expect(err instanceof Error).toEqual(true);
        done();
      });
    });
  });
  
  it("preserves existing files and folders", function(done) {

    var blogDir = localPath(global.blog.id,'/');
    var fs = require('fs-extra');

    fs.outputFileSync(blogDir + '/first.txt', 'Hello');
    fs.outputFileSync(blogDir + '/Sub Folder/second.txt', 'World');
    fs.outputFileSync(blogDir + '/third', '!');

    create(global.blog, function(err){
      
      if (err) return done(err);

      // Verify files and folders are preserved on Blot's copy of blog folder
      expect(fs.readdirSync(blogDir)).toEqual(['.git', 'Sub Folder', 'first.txt', 'third']);
      expect(fs.readdirSync(blogDir + '/Sub Folder')).toEqual(['second.txt']);

      clone(function(err, clonedDir){

        if (err) return done(err);

        // Verify files and folders are preserved in cloneable folder
        expect(fs.readdirSync(clonedDir)).toEqual(['.git', 'Sub Folder', 'first.txt', 'third']);
        expect(fs.readdirSync(clonedDir + '/Sub Folder')).toEqual(['second.txt']);

        done();
      });
    });
  });

});
