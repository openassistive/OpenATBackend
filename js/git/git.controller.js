'use strict';
var Git = require("nodegit");
var path = require("path");

exports.cloneGit = function() {

    // Clone a given repository into the `./tmp` folder.
    Git.Clone("https://github.com/nodegit/nodegit", "./tmp")
        // Look up this known commit.
        .then(function(repo) {
            // Use a known commit sha from this repository.
            return repo.getCommit("59b20b8d5c6ff8d09518454d4dd8b7b30f095ab5");
        })
        // Look up a specific file within that commit.
        .then(function(commit) {
            return commit.getEntry("README.md");
        })
        // Get the blob contents from the file.
        .then(function(entry) {
            // Patch the blob to contain a reference to the entry.
            return entry.getBlob().then(function(blob) {
                blob.entry = entry;
                return blob;
            });
        })
        // Display information about the blob.
        .then(function(blob) {
            // Show the path, sha, and filesize in bytes.
            console.log(blob.entry.path() + blob.entry.sha() + blob.rawsize() + "b");

            // Show a spacer.
            console.log(Array(72).join("=") + "\n\n");

            // Show the entire file.
            console.log(String(blob));
        })
        .catch(function(err) {
            console.log(err);
        });
};

exports.pushGit = function() {
    var nodegit = require("nodegit");
    var path = require("path");
    var promisify = require("promisify-node");
    var fse = promisify(require("fs-extra"));
    fse.ensureDir = promisify(fse.ensureDir);

    var fileName = "newFile.txt";
    var fileContent = "hello world";

    var repoDir = "../../newRepo";

    var repository;
    var remote;

    var signature = nodegit.Signature.create("Foo bar",
        "foo@bar.com", 123456789, 60);

    // Create a new repository in a clean directory, and add our first file
    fse.remove(path.resolve(__dirname, repoDir))
        .then(function() {
            return fse.ensureDir(path.resolve(__dirname, repoDir));
        })
        .then(function() {
            return nodegit.Repository.init(path.resolve(__dirname, repoDir), 0);
        })
        .then(function(repo) {
            repository = repo;
            return fse.writeFile(path.join(repository.workdir(), fileName), fileContent);
        })

    // Load up the repository index and make our initial commit to HEAD
    .then(function() {
            return repository.refreshIndex();
        })
        .then(function(index) {
            index.read(1);
            index.addByPath(fileName);
            index.write();

            return index.writeTree();
        })
        .then(function(oid) {
            return repository.createCommit("HEAD", signature, signature,
                "initial commit", oid, []);
        })

    // Add a new remote
    .then(function() {
        return nodegit.Remote.create(repository, "origin",
                "https://github.com/openassistive/OpenATFrontEnd/tree/master/content/item")
            .then(function(remoteResult) {
                remote = remoteResult;

                remote.setCallbacks({
                    credentials: function(url, userName) {
                        return nodegit.Cred.sshKeyFromAgent(userName);
                    }
                });

                return remote.connect(nodegit.Enums.DIRECTION.PUSH);
            })
            .then(function() {
                // Create the push object for this remote
                return remote.push(
                    ["refs/heads/master:refs/heads/master"],
                    null,
                    repository.defaultSignature(),
                    "Push to master");
            });
    }).done(function() {
        console.log("Done!");
    });
}

exports.pushGit1 = function() {

    var nodegit = require("nodegit"),
        repoFolder = path.resolve(__dirname, '../../newRepo/.git'),
        fileToStage = 'README.md';

    var repo, index, oid;


    nodegit.Repository.open(repoFolder)
        .then(function(repoResult) {
            console.log(repoResult);
            repo = repoResult;
            return repoResult.refreshIndex();
        })
        .then(function(indexResult) {
            index = indexResult;
            // this file is in the root of the directory and doesn't need a full path
            index.addByPath(fileToStage);
            // this will write files to the index
            index.write();
            return index.writeTree();
        }).then(function(oidResult) {
            oid = oidResult;
            return nodegit.Reference.nameToId(repo, "HEAD");
        }).then(function(head) {
            return repo.getCommit(head);
        }).then(function(parent) {
            var timestamp = Math.floor((new Date()).getTime() / 1000),
                author = nodegit.Signature.create("WebPro9369",
                    "Horea_69@outlook.com", timestamp, 0),
                committer = nodegit.Signature.create("WebPro9369",
                    "Horea_69@outlook.com", timestamp, 0);

            return repo.createCommit("HEAD", author, committer, "Added the Readme file for theme builder", oid, [parent]);
        }).then(function(commitId) {
            return console.log("New Commit: ", commitId);

            // PULL
        }).then(function() {
            return repo.fetchAll({
                credentials: function(url, userName) {
                    return nodegit.Cred.sshKeyFromAgent(userName);
                },
                certificateCheck: function() {
                    return 1;
                }
            });
        })
        // Now that we're finished fetching, go ahead and merge our local branch
        // with the new one
        .then(function() {
            return repo.mergeBranches("master", "origin/master");
        }).then(function() {
            return console.log("Pull Done!");
        })
        /// PUSH
        .then(function() {
            return nodegit.Remote.load(repo, "origin")
                .then(function(remote) {
                    remote.setCallbacks({
                        credentials: function(url, userName) {
                            return nodegit.Cred.sshKeyFromAgent(userName);
                        }
                    });


                    return remote.connect(nodegit.Enums.DIRECTION.PUSH)
                        .then(function() {
                            console.log('Connected?', remote.connected())
                            return remote.push()
                        }).catch(function(reason) {
                            console.log(reason);
                        });

                });
        })
        .done(function() {
            console.log("Push Done!");
        });
}

exports.pushGit2 = function() {
    var nodegit = require("nodegit");
    var path = require("path");
    var promisify = require("promisify-node");
    var fse = promisify(require("fs-extra"));
    fse.ensureDir = promisify(fse.ensureDir);

    var fileName = "newFile.txt";
    var fileContent = "hello world";

    var repoDir = "../../newRepo";

    var repository;
    var remote;
    var timestamp = Math.floor((new Date()).getTime() / 1000);
    var signature = nodegit.Signature.create("WebPro9369",
        "Horea_69@outlook.com", timestamp, 30);

    // Create a new repository in a clean directory, and add our first file
    fse.remove(path.resolve(__dirname, repoDir))
        .then(function() {
            return fse.ensureDir(path.resolve(__dirname, repoDir));
        })
        .then(function() {
            return nodegit.Repository.init(path.resolve(__dirname, repoDir), 0);
        })
        .then(function(repo) {
            repository = repo;
            return fse.writeFile(path.join(repository.workdir(), fileName), fileContent);
        })

    // Load up the repository index and make our initial commit to HEAD
    .then(function() {
            return repository.refreshIndex();
        })
        .then(function(index) {
            return index.addByPath(fileName)
                .then(function() {
                    return index.write();
                })
                .then(function() {
                    return index.writeTree();
                });
        })
        .then(function(oid) {
            return repository.createCommit("HEAD", signature, signature,
                "initial commit", oid, []);
        })

    // Add a new remote
    .then(function() {

        return nodegit.Remote.create(repository, "origin",
                "git@github.com:WebPro9369/test.git")
            .then(function(remoteResult) {
                remote = remoteResult;
                console.log("here we are ");
                // Create the push object for this remote
                return remote.push(
                    ["refs/heads/master:refs/heads/master"], {
                        callbacks: {
                            credentials: function(url, userName) {
                                console.log(userName);

                                return nodegit.Cred.sshKeyFromAgent(userName);
                                //return "SHA256:Tdtci49JQ8MzNtA8PFMT8fWYH9tq5cKkwVMb05yIaEA";
                            }
                        }
                    }
                );
            });
    }).done(function() {
        console.log("Done!");
    });
}

exports.simpleGit = function() {
    // update repo and get a list of tags 
    require('simple-git')(path.resolve(__dirname, '../../newRepo/.git'))
        .pull()
        .tags(function(err, tags) {
            console.log("Latest available tag: %s", tags.latest);
        });

    // update repo and when there are changes, restart the app 
    require('simple-git')()
        .pull(function(err, update) {
            if (update && update.summary.changes) {
                require('child_process').exec('npm restart');
            }
        });

    // starting a new repo 
    require('simple-git')()
        .init()
        .add('./*')
        .commit("first commit!")
        .addRemote('origin', 'https://github.com/WebPro9369/test')
        .push('origin', 'master');

    // push with -u 
    require('simple-git')()
        .add('./*')
        .commit("first commit!")
        .addRemote('origin', 'https://github.com/WebPro9369/test')
        .push(['-u', 'origin', 'master'], function() {
            // done. 
        });

    // piping to the console for long running tasks 
    require('simple-git')()
        .outputHandler(function(command, stdout, stderr) {
            stdout.pipe(process.stdout);
            stderr.pipe(process.stderr);
        })
        .checkout('https://github.com/WebPro9369/test');

    // update repo and print messages when there are changes, restart the app 
    require('simple-git')()
        .then(function() {
            console.log('Starting pull...');
        })
        .pull(function(err, update) {
            if (update && update.summary.changes) {
                require('child_process').exec('npm restart');
            }
        })
        .then(function() {
            console.log('pull done.');
        });

    // get a full commits list, and then only between 0.11.0 and 0.12.0 tags 
    require('simple-git')()
        .log(function(err, log) {
            console.log(log);
        })
        .log('0.11.0', '0.12.0', function(err, log) {
            console.log(log);
        });

    // set the local configuration for author, then author for an individual commit 
    require('simple-git')()
        .addConfig('user.name', 'Some One')
        .addConfig('user.email', 'some@one.com')
        .commit('committed as "Some One"', 'file-one')
        .commit('committed as "Another Person"', 'file-two', { '--author': '"Another Person <another@person.com>"' });

    // get remote repositories 
    require('simple-git')()
        .listRemote(['--get-url'], function(err, data) {
            if (!err) {
                console.log('Remote url for repository at ' + __dirname + ':');
                console.log(data);
            }
        });
}