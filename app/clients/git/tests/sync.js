describe("sync", function() {
  // Sets up a clean test blog (this.blog) for each test,
  // sets the blog's client to git (this.client), then creates
  // a test server with the git client's routes exposed, then
  // cleans everything up when each test has finished.
  require("./setup")();

  var CheckEntry = global.test.CheckEntry;
  var fs = require("fs-extra");
  var async = require("async");

  beforeEach(function() {
    this.checkEntry = new CheckEntry(this.blog.id);

    this.writeAndCommit = new WriteAndCommit(this.git, this.repoDirectory);
    this.push = new Push(this.blog.id, this.git);
    this.writeAndPush = new WriteAndPush(
      this.blog.id,
      this.git,
      this.repoDirectory
    );
  });

  function Push(blogID, git) {
    return function(callback) {
      git.push(function(err) {
        if (err) return callback(new Error(err));

        (function wait(blogID, callback) {
          // This is blot's sync function, NOT
          // the git client's sync function.
          require("sync")(
            blogID,
            function(_cb) {
              _cb(null);
            },
            function(err, unavailable) {
              if (err) return callback(err);

              if (unavailable) {
                setTimeout(function() {
                  wait(blogID, callback);
                }, 1000);
              } else {
                callback(null);
              }
            }
          );
        })(blogID, callback);
      });
    };
  }

  function WriteAndCommit(git, repoDirectory) {
    return function(path, content, callback) {
      var output = repoDirectory + path;

      fs.outputFile(output, content, function(err) {
        if (err) return callback(err);

        git.add(repoDirectory + path, function(err) {
          if (err) return callback(new Error(err));

          git.commit("Wrote" + path, function(err) {
            if (err) return callback(new Error(err));

            callback();
          });
        });
      });
    };
  }

  // Write file to user's clone of the blog's git repo, then
  // push changes to the server, wait for sync to finish.
  function WriteAndPush(blogID, git, repoDirectory) {
    var writeAndCommit = new WriteAndCommit(git, repoDirectory);
    var push = new Push(blogID, git);

    return function(path, content, callback) {
      writeAndCommit(path, content, function(err) {
        if (err) return callback(err);

        push(callback);
      });
    };
  }

  it("syncs a file", function(done) {
    var path = this.fake.path(".txt");
    var content = this.fake.file();
    var checkEntry = this.checkEntry;

    this.writeAndPush(path, content, function(err) {
      if (err) return done.fail(err);

      checkEntry({ path: path }, function(err) {
        if (err) return done.fail(err);

        done();
      });
    });
  });

  it("syncs updates to a file", function(done) {
    var checkEntry = this.checkEntry;
    var writeAndPush = this.writeAndPush;

    var path = this.fake.path(".txt");

    var title = this.fake.lorem.sentence();
    var content = this.fake.file({ title: title });

    var changedTitle = this.fake.lorem.sentence();
    var changedContent = this.fake.file({ title: changedTitle });

    writeAndPush(path, content, function(err) {
      if (err) return done.fail(err);

      checkEntry({ path: path, title: title }, function(err) {
        if (err) return done.fail(err);

        writeAndPush(path, changedContent, function(err) {
          if (err) return done.fail(err);

          checkEntry({ path: path, title: changedTitle }, function(err) {
            if (err) return done.fail(err);
            done();
          });
        });
      });
    });
  });

  it("syncs the changes of multiple commits pushed at once", function(done) {
    var writeAndCommit = this.writeAndCommit;
    var checkEntry = this.checkEntry;
    var push = this.push;

    var files = {};

    for (var i = 0; i < 3; i++)
      files[this.fake.path(".txt")] = this.fake.file();

    async.eachOf(
      files,
      function(content, path, next) {
        writeAndCommit(path, content, next);
      },
      function(err) {
        if (err) return done.fail(err);

        push(function(err) {
          if (err) return done.fail(err);

          async.eachOf(
            files,
            function(content, path, next) {
              checkEntry({ path: path }, next);
            },
            done
          );
        });
      }
    );
  });
});
