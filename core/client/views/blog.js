/*global window, document, Ghost, $, _, Backbone, JST */
(function () {
    "use strict";

    var ContentList,
        ContentItem,
        PreviewContainer;

    // Base view
    // ----------
    Ghost.Views.Blog = Ghost.View.extend({
        initialize: function (options) {
            this.addSubview(new PreviewContainer({ el: '.js-content-preview', collection: this.collection })).render();
            this.addSubview(new ContentList({ el: '.js-content-list', collection: this.collection })).render();
        }
    });


    // Content list (sidebar)
    // -----------------------
    ContentList = Ghost.View.extend({

        events: {
            'click .content-list-content'    : 'scrollHandler'
        },

        initialize: function (options) {
            this.$('.content-list-content').scrollClass({target: '.content-list', offset: 10});
            this.listenTo(this.collection, 'remove', this.showNext);
        },

        showNext: function () {
            var id = this.collection.at(0).id;
            if (id) {
                Backbone.trigger('blog:activeItem', id);
            }
        },

        render: function () {
            this.collection.each(function (model) {
                this.$('ol').append(this.addSubview(new ContentItem({model: model})).render().el);
            }, this);
            this.showNext();
        }

    });

    // Content Item
    // -----------------------
    ContentItem = Ghost.View.extend({

        tagName: 'li',

        events: {
            'click a': 'setActiveItem'
        },

        active: false,

        initialize: function () {
            this.listenTo(Backbone, 'blog:activeItem', this.checkActive);
            this.listenTo(this.model, 'destroy', this.removeItem);
        },

        removeItem: function () {
            var self = this;
            $.when(this.$el.slideUp()).then(function () {
                self.remove();
            });
        },

        // If the current item isn't active, we trigger the event to
        // notify a change in which item we're viewing.
        setActiveItem: function (e) {
            e.preventDefault();
            if (this.active !== true) {
                Backbone.trigger('blog:activeItem', this.model.id);
                this.render();
            }
        },

        // Checks whether this item is active and doesn't match the current id.
        checkActive: function (id) {
            if (this.model.id !== id) {
                if (this.active) {
                    this.active = false;
                    this.$el.removeClass('active');
                    this.render();
                }
            } else {
                this.active = true;
                this.$el.addClass('active');
            }
        },

        showPreview: function (e) {
            var item = $(e.currentTarget);
            this.$('.content-list-content li').removeClass('active');
            item.addClass('active');
            Backbone.trigger('blog:activeItem', item.data('id'));
        },

        templateName: "list-item",

        templateData: function () {
            return _.extend({active: this.active}, this.model.toJSON());
        }
    });

    // Content preview
    // ----------------
    PreviewContainer = Ghost.View.extend({

        activeId: null,

        events: {
            'click .post-controls .delete' : 'deletePost',
            'click .post-controls .post-edit' : 'editPost'
        },

        initialize: function (options) {
            this.listenTo(Backbone, 'blog:activeItem', this.setActivePreview);
        },

        setActivePreview: function (id) {
            if (this.activeId !== id) {
                this.activeId = id;
                this.render();
            }
        },

        deletePost: function (e) {
            e.preventDefault();
            var self = this;
            this.addSubview(new Ghost.Views.Modal({
                model: {
                    options: {
                        close: false,
                        confirm: {
                            accept: {
                                func: function () {
                                    self.model.destroy({
                                        wait: true
                                    }).then(function () {
                                        Ghost.notifications.addItem({
                                            type: 'success',
                                            message: 'Your post has been deleted.',
                                            status: 'passive'
                                        });
                                    }, function () {
                                        Ghost.notifications.addItem({
                                            type: 'error',
                                            message: 'Your post could not be deleted. Please try again.',
                                            status: 'passive'
                                        });
                                    });
                                },
                                text: "Yes"
                            },
                            reject: {
                                func: function () {
                                    return true;
                                },
                                text: "No"
                            }
                        },
                        type: "action",
                        style: ["wide", "centered"],
                        animation: 'fade'
                    },
                    content: {
                        template: 'blank',
                        title: 'Are you sure you want to delete this post?'
                    }
                }
            }));
        },

        editPost: function (e) {
            e.preventDefault();
            // for now this will disable "open in new tab", but when we have a Router implemented
            // it can go back to being a normal link to '#/ghost/editor/X'
            window.location = '/ghost/editor/' + this.model.get('id');
        },

        templateName: "preview",

        render: function () {
            if (this.activeId) {
                this.model = this.collection.get(this.activeId);
                this.$el.html(this.template(this.templateData()));
            }
            this.$('.content-preview-content').scrollClass({target: '.content-preview', offset: 10});
            this.$('.wrapper').on('click', 'a', function (e) {
                $(e.currentTarget).attr('target', '_blank');
            });
            Ghost.temporary.initToggles(this.$el);
            return this;
        }

    });

}());