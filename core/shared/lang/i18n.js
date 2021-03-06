var fs = require('fs'),
    /**
     * Create new Polyglot object
     * @type {Polyglot}
     */
    I18n;

I18n = function (ghost) {

    // TODO: validate
    var lang = ghost.settings().defaultLang,
        path = ghost.paths().lang,
        langFilePath = path + lang + '.json';

    return function (req, res, next) {

        if (lang === 'en') {
            // TODO: do stuff here to optimise for en

            // Make jslint empty block error go away
            lang = 'en';
        }

        /** TODO: potentially use req.acceptedLanguages rather than the default
        *   TODO: handle loading language file for frontend on frontend request etc
        *   TODO: switch this mess to be promise driven */
        fs.stat(langFilePath, function (error) {
            if (error) {
                console.log('No language file found for language ' + lang + '. Defaulting to en');
                lang = 'en';
            }

            fs.readFile(langFilePath, function (error, data) {
                if (error) {
                    throw error;
                }

                try {
                    data = JSON.parse(data);
                } catch (e) {
                    throw e; // TODO: do something better with the error here
                }

                ghost.polyglot().extend(data);

                next();
            });
        });
    };
};


module.exports.load = I18n;