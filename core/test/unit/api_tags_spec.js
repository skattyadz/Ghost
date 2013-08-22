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
                postWithoutTag.related('tags').should.be.empty;
                done();
            }).then(null, done); 
        });

        describe('resetting tags from an array on update', function () {
            // When a Post is updated, iterate through the existing tags, and detach any that have since been removed.
            // It can be assumed that any remaining tags in the update data are newly added.
            // Create new tags if needed, and attach them to the Post

            function seedTags (tagNames) {
                var createOperations = [
                    PostModel.add({title: 'title', content_raw: 'content'})
                ];

                var tagModels = tagNames.map(function(tagName) { return TagModel.add({name: tagName}) });
                createOperations = createOperations.concat(tagModels);


                return when.all(createOperations).then(function (models) {
                    var postModel = models[0],
                        attachOperations;

                    attachOperations = [
                        postModel.tags().attach(models[1]),
                        postModel.tags().attach(models[2]),
                        postModel.tags().attach(models[3])
                    ];

                    return when.all(attachOperations).then(function() {
                        return postModel;
                    });
                }).then(function(postModel) {
                    return PostModel.read({id: postModel.id}, { withRelated: ['tags']});
                });
            }

            it('does nothing if tags havent changed', function (done) {
                var newTags = ['tag1', 'tag2', 'tag3'];

                seedTags(newTags).then(function (postModel) {
                    return postModel.set('tags', newTags).save();
                }).then(function(postModel) {
                    var tagNames = postModel.related('tags').models.map(function(t) { return t.attributes.name });
                    tagNames.should.eql(newTags);

                    done();
                }).then(null, done);

            });

            it('detaches tags that have been removed', function (done) {
                var initialTags = ['tag1', 'tag2', 'tag3'];
                var newTags = ['tag1', 'tag3'];

                seedTags(initialTags).then(function (postModel) {
                    return postModel.set('tags', newTags).save();
                }).then(function(postModel) {
                    var tagNames = postModel.related('tags').models.map(function(t) { return t.attributes.name });
                    tagNames.should.eql(newTags);

                    done();
                }).then(null, done);
            });

            it('attaches tags that are new to the post, but aleady exist in the database');

            it('creates and attaches tags that are new to the Tags table');

        });

    });

});
