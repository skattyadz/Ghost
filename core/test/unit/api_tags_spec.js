/*globals describe, beforeEach, it */
var _ = require("underscore"),
    when = require('when'),
    sequence = require('when/sequence'),
    should = require('should'),
    helpers = require('./helpers'),
    Models = require('../../server/models');

describe('Tag Model', function () {

    var TagModel = Models.Tag;

    beforeEach(function (done) {
        helpers.resetData().then(function () {
            done();
        }, done);
    });

    describe('a Post', function () {
        var PostModel = Models.Post;

        it('can add a tag', function (done) {
            var newPost = {title: 'Test Title 1', content_raw: 'Test Content 1'},
                newTag = {name: 'tag1'},
                createdPostID;

            when.all([
                PostModel.add(newPost),
                TagModel.add(newTag)
            ]).then(function (models) {
                var createdPost = models[0],
                    createdTag = models[1];

                createdPostID = createdPost.id;
                return createdPost.tags().attach(createdTag);
            }).then(function () {
                return PostModel.read({id: createdPostID}, { withRelated: ['tags']});
            }).then(function (postWithTag) {
                postWithTag.related('tags').length.should.equal(1);
                done();
            }).then(null, done);

        });

        it('can remove a tag', function(done) {
            // The majority of this test is ripped from above, which is obviously a Bad Thing.
            // Would be nice to find a way to seed data with relations for cases like this,
            // because there are more DB hits than needed
            var newPost = {title: 'Test Title 1', content_raw: 'Test Content 1'},
                newTag = {name: 'tag1'},
                createdTagID,
                createdPostID;

            when.all([
                PostModel.add(newPost),
                TagModel.add(newTag)
            ]).then(function (models) {
                var createdPost = models[0],
                    createdTag = models[1];

                createdPostID = createdPost.id;
                createdTagID = createdTag.id;
                return createdPost.tags().attach(createdTag);
            }).then(function () {
                return PostModel.read({id: createdPostID}, { withRelated: ['tags']});
            }).then(function (postWithTag) {
                return postWithTag.tags().detach(createdTagID);
            }).then(function () {
                return PostModel.read({id: createdPostID}, { withRelated: ['tags']});
            }).then(function (postWithoutTag) {
                postWithoutTag.related('tags').length.should.equal(0);
                done();
            }).then(null, done); 
        });

        it('can reset its tags from an array');

    });

});
