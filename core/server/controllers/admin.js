var Ghost = require('../../ghost'),
    dataExport = require('../data/export'),
    dataImport = require('../data/import'),
    _ = require('underscore'),
    fs = require('fs-extra'),
    path = require('path'),
    when = require('when'),
    nodefn = require('when/node/function'),
    api = require('../api'),
    moment = require('moment'),
    errors = require('../errorHandling'),

    ghost = new Ghost(),
    dataProvider = ghost.dataProvider,
    adminNavbar,
    adminControllers,
    loginSecurity = [];

 // TODO: combine path/navClass to single "slug(?)" variable with no prefix
adminNavbar = {
    dashboard: {
        name: 'Dashboard',
        navClass: 'dashboard',
        key: 'admin.navbar.dashboard',
        path: '/'
    },
    content: {
        name: 'Content',
        navClass: 'content',
        key: 'admin.navbar.content',
        path: '/content/'
    },
    add: {
        name: 'New Post',
        navClass: 'editor',
        key: 'admin.navbar.editor',
        path: '/editor/'
    },
    settings: {
        name: 'Settings',
        navClass: 'settings',
        key: 'admin.navbar.settings',
        path: '/settings/'
    }
};


// TODO: make this a util or helper
function setSelected(list, name) {
    _.each(list, function (item, key) {
        item.selected = key === name;
    });
    return list;
}

adminControllers = {
    'uploader': function (req, res) {
        var currentDate = moment(),
            month = currentDate.format("MMM"),
            year =  currentDate.format("YYYY"),
            tmp_path = req.files.uploadimage.path,
            dir = path.join('content/images', year, month),
            target_path = path.join(dir, req.files.uploadimage.name),
            ext = path.extname(req.files.uploadimage.name).toLowerCase(),
        // the src for the image must be in URI format, not a file system path, which in Windows uses \
            src = path.join('/', target_path).replace(new RegExp('\\' + path.sep, 'g'), '/');

        function renameFile() {
            // adds directories recursively
            fs.mkdirs(dir, function (err) {
                if (err) {
                    errors.logError(err);
                } else {
                    fs.copy(tmp_path, target_path, function (err) {
                        if (err) {
                            errors.logError(err);
                        } else {
                            res.send(src);
                        }
                    });
                }
            });
        }

        if (ext === ".jpg" || ext === ".png" || ext === ".gif") {
            renameFile();
        } else {
            res.send(404, "Invalid filetype");
        }
    },
    'login': function (req, res) {
        res.render('signup', {
            bodyClass: 'ghost-login',
            hideNavbar: true,
            adminNav: setSelected(adminNavbar, 'login')
        });
    },
    'auth': function (req, res) {
        var currentTime = process.hrtime()[0],
            denied = '';
        loginSecurity = _.filter(loginSecurity, function (ipTime) {
            return (ipTime.time + 2 > currentTime);
        });
        denied = _.find(loginSecurity, function (ipTime) {
            return (ipTime.ip === req.connection.remoteAddress);
        });

        if (!denied) {
            loginSecurity.push({ip: req.connection.remoteAddress, time: process.hrtime()[0]});
            api.users.check({email: req.body.email, pw: req.body.password}).then(function (user) {
                req.session.user = user.id;
                res.json(200, {redirect: req.body.redirect ? '/ghost/'
                    + decodeURIComponent(req.body.redirect) : '/ghost/'});
            }, function (error) {
                res.json(401, {error: error.message});
            });
        } else {
            res.json(401, {error: 'Slow down, there are way too many login attempts!'});
        }

    },
    changepw: function (req, res) {
        api.users.changePassword({
            currentUser: req.session.user,
            oldpw: req.body.password,
            newpw: req.body.newpassword,
            ne2pw: req.body.ne2password
        }).then(function () {
            res.json(200, {msg: 'Password changed successfully'});
        }, function (error) {
            res.send(401, {error: error.message});
        });

    },
    'signup': function (req, res) {
        res.render('signup', {
            bodyClass: 'ghost-login',
            hideNavbar: true,
            adminNav: setSelected(adminNavbar, 'login')
        });
    },

    'doRegister': function (req, res) {
        var name = req.body.name,
            email = req.body.email,
            password = req.body.password;

        api.users.add({
            full_name: name,
            email_address: email,
            password: password
        }).then(function (user) {

            if (req.session.user === undefined) {
                req.session.user = user.id;
            }
            res.json(200, {redirect: '/ghost/'});
        }, function (error) {
            res.json(401, {error: error.message});
        });

    },

    'forgotten': function (req, res) {
        res.render('signup', {
            bodyClass: 'ghost-forgotten',
            hideNavbar: true,
            adminNav: setSelected(adminNavbar, 'login')
        });
    },

    'resetPassword': function (req, res) {
        var email = req.body.email;

        api.users.forgottenPassword(email).then(function (user) {
            var message = {
                    to: email,
                    subject: 'Your new password',
                    html: "<p><strong>Hello!</strong></p>" +
                          "<p>You've reset your password. Here's the new one: " + user.newPassword + "</p>" +
                          "<p>Ghost <br/>" +
                          '<a href="' + ghost.config().env[process.env.NODE_ENV].url + '">' +
                           ghost.config().env[process.env.NODE_ENV].url + '</a></p>'
                };

            return ghost.mail.send(message);
        }).then(function success() {
            var notification = {
                type: 'success',
                message: 'Your password was changed successfully. Check your email for details.',
                status: 'passive',
                id: 'successresetpw'
            };

            return api.notifications.add(notification).then(function () {
                res.json(200, {redirect: '/ghost/signin/'});
            });

        }, function failure(error) {
            res.json(401, {error: error.message});
        }).otherwise(errors.logAndThrowError);
    },
    'logout': function (req, res) {
        delete req.session.user;
        var notification = {
            type: 'success',
            message: 'You were successfully signed out',
            status: 'passive',
            id: 'successlogout'
        };

        return api.notifications.add(notification).then(function () {
            res.redirect('/ghost/signin/');
        });
    },
    'index': function (req, res) {
        res.render('dashboard', {
            bodyClass: 'dashboard',
            adminNav: setSelected(adminNavbar, 'dashboard')
        });
    },
    'editor': function (req, res) {
        if (req.params.id !== undefined) {
            res.render('editor', {
                bodyClass: 'editor',
                adminNav: setSelected(adminNavbar, 'content')
            });
        } else {
            res.render('editor', {
                bodyClass: 'editor',
                adminNav: setSelected(adminNavbar, 'add')
            });
        }
    },
    'content': function (req, res) {
        res.render('content', {
            bodyClass: 'manage',
            adminNav: setSelected(adminNavbar, 'content')
        });
    },
    'settings': function (req, res) {
        res.render('settings', {
            bodyClass: 'settings',
            adminNav: setSelected(adminNavbar, 'settings')
        });
    },
    'debug': { /* ugly temporary stuff for managing the app before it's properly finished */
        index: function (req, res) {
            res.render('debug', {
                bodyClass: 'settings',
                adminNav: setSelected(adminNavbar, 'settings')
            });
        },
        'export': function (req, res) {
            // Get current version from settings
            api.settings.read({ key: "currentVersion" })
                .then(function (setting) {
                    // Export the current versions data
                    return dataExport(setting.value);
                }, function () {
                    // If no setting, assume 001
                    return dataExport("001");
                })
                .then(function (exportedData) {
                    // Save the exported data to the file system for download
                    var fileName = path.resolve(__dirname + '/../../server/data/export/exported-' + (new Date().getTime()) + '.json');

                    return nodefn.call(fs.writeFile, fileName, JSON.stringify(exportedData)).then(function () {
                        return when(fileName);
                    });
                })
                .then(function (exportedFilePath) {
                    // Send the exported data file
                    res.download(exportedFilePath, 'GhostData.json');
                })
                .otherwise(function (error) {
                    // Notify of an error if it occurs
                    var notification = {
                        type: 'error',
                        message: error.message || error,
                        status: 'persistent',
                        id: 'per-' + (ghost.notifications.length + 1)
                    };

                    return api.notifications.add(notification).then(function () {
                        res.redirect("/ghost/debug/");
                    });
                });
        },
        'import': function (req, res) {
            if (!req.files.importfile) {
                // Notify of an error if it occurs
                var notification = {
                    type: 'error',
                    message:  "Must select a file to import",
                    status: 'persistent',
                    id: 'per-' + (ghost.notifications.length + 1)
                };

                return api.notifications.add(notification).then(function () {
                    res.redirect("/ghost/debug/");
                });
            }

            // Get the current version for importing
            api.settings.read({ key: "currentVersion" })
                .then(function (setting) {
                    return when(setting.value);
                }, function () {
                    return when("001");
                })
                .then(function (currentVersion) {
                    // Read the file contents
                    return nodefn.call(fs.readFile, req.files.importfile.path)
                        .then(function (fileContents) {
                            var importData;

                            // Parse the json data
                            try {
                                importData = JSON.parse(fileContents);
                            } catch (e) {
                                return when.reject(new Error("Failed to parse the import file"));
                            }

                            if (!importData.meta || !importData.meta.version) {
                                return when.reject(new Error("Import data does not specify version"));
                            }

                            // Import for the current version
                            return dataImport(currentVersion, importData);
                        });
                })
                .then(function importSuccess() {
                    var notification = {
                        type: 'success',
                        message: "Data imported. Log in with the user details you imported",
                        status: 'persistent',
                        id: 'per-' + (ghost.notifications.length + 1)
                    };

                    return api.notifications.add(notification).then(function () {
                        delete req.session.user;
                        res.redirect('/ghost/signin/');
                    });

                }, function importFailure(error) {
                    // Notify of an error if it occurs
                    var notification = {
                        type: 'error',
                        message: error.message || error,
                        status: 'persistent',
                        id: 'per-' + (ghost.notifications.length + 1)
                    };

                    return api.notifications.add(notification).then(function () {
                        res.redirect('/ghost/debug/');
                    });
                });
        },
        'reset': function (req, res) {
            // Grab the current version so we can get the migration
            dataProvider.reset()
                .then(function resetSuccess() {
                    var notification = {
                        type: 'success',
                        message: "Database reset. Create a new user",
                        status: 'persistent',
                        id: 'per-' + (ghost.notifications.length + 1)
                    };

                    return api.notifications.add(notification).then(function () {
                        delete req.session.user;
                        res.redirect('/ghost/signup/');
                    });
                }, function resetFailure(error) {
                    var notification = {
                        type: 'error',
                        message: error.message || error,
                        status: 'persistent',
                        id: 'per-' + (ghost.notifications.length + 1)
                    };

                    return api.notifications.add(notification).then(function () {
                        res.redirect('/ghost/debug/');
                    });
                });
        }
    }
};

module.exports = adminControllers;
