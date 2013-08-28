// # Article Editor

/*global window, document, $, _, Backbone, Ghost, Showdown, CodeMirror, shortcut, Countable, JST */
(function () {
    "use strict";

    var PublishBar,
        TagWidget,
        ActionsWidget,
        MarkdownShortcuts = [
            {'key': 'Ctrl+B', 'style': 'bold'},
            {'key': 'Meta+B', 'style': 'bold'},
            {'key': 'Ctrl+I', 'style': 'italic'},
            {'key': 'Meta+I', 'style': 'italic'},
            {'key': 'Ctrl+Alt+U', 'style': 'strike'},
            {'key': 'Ctrl+Shift+K', 'style': 'code'},
            {'key': 'Meta+K', 'style': 'code'},
            {'key': 'Ctrl+Alt+1', 'style': 'h1'},
            {'key': 'Ctrl+Alt+2', 'style': 'h2'},
            {'key': 'Ctrl+Alt+3', 'style': 'h3'},
            {'key': 'Ctrl+Alt+4', 'style': 'h4'},
            {'key': 'Ctrl+Alt+5', 'style': 'h5'},
            {'key': 'Ctrl+Alt+6', 'style': 'h6'},
            {'key': 'Ctrl+Shift+L', 'style': 'link'},
            {'key': 'Ctrl+Shift+I', 'style': 'image'},
            {'key': 'Ctrl+Q', 'style': 'blockquote'},
            {'key': 'Ctrl+Shift+1', 'style': 'currentDate'},
            {'key': 'Ctrl+U', 'style': 'uppercase'},
            {'key': 'Ctrl+Shift+U', 'style': 'lowercase'},
            {'key': 'Ctrl+Alt+Shift+U', 'style': 'titlecase'},
            {'key': 'Ctrl+Alt+W', 'style': 'selectword'},
            {'key': 'Ctrl+L', 'style': 'list'},
            {'key': 'Ctrl+Alt+C', 'style': 'copyHTML'},
            {'key': 'Meta+Alt+C', 'style': 'copyHTML'}
        ];

    // The publish bar associated with a post, which has the TagWidget and
    // Save button and options and such.
    // ----------------------------------------
    PublishBar = Ghost.View.extend({

        initialize: function () {
            this.addSubview(new TagWidget({el: this.$('#entry-tags'), model: this.model})).render();
            this.addSubview(new ActionsWidget({el: this.$('#entry-actions'), model: this.model})).render();
        },

        render: function () { return this; }

    });

    // The Tag UI area associated with a post
    // ----------------------------------------
    TagWidget = Ghost.View.extend({

        events: {
            'keyup [data-input-behaviour="tag"]': 'handleKeyup',
            'keydown [data-input-behaviour="tag"]': 'handleKeydown',
            'click ul.suggestions li': 'handleSuggestionClick',
            'click .tags .tag': 'handleTagClick'
        },

        keys: {
            UP: 38,
            DOWN: 40,
            ESC: 27,
            ENTER: 13,
            COMMA: 188,
            BACKSPACE: 8
        },

        initialize: function () {
        },

        render: function () {
            var tags = this.model.get('tags'),
                $tags = $('.tags'),
                tagOffset;

            $tags.empty();
            tags.forEach(function (tag) {
                var $tag = $('<span class="tag" data-tag-id="' + tag.id + '">' + tag.name + '</span>');

                $tags.append($tag);
            });

            this.$suggestions = $("ul.suggestions").hide(); // Initialise suggestions overlay

            if (tags.length) {
                tagOffset = $('.tag-input').offset().left;
                $('.tag-blocks').css({'left': tagOffset + 'px'});
            }

            return this;
        },

        getAllGhostTags: function () {
            return [{id:1, name: 'first tag'}, {id:2, name: 'secnod tag'}];
        },

        showSuggestions: function ($target, searchTerm) {
            this.$suggestions.show();
            var results = this.findMatchingTags(searchTerm),
                styles = {
                    left: $target.position().left
                },
                maxSuggestions = 5, // Limit the suggestions number
                results_length = results.length,
                i,
                suggest;

            this.$suggestions.css(styles);
            this.$suggestions.html("");

            if (results_length < maxSuggestions) {
                maxSuggestions = results_length;
            }
            for (i = 0; i < maxSuggestions; i += 1) {
                this.$suggestions.append("<li data-tag-id='"+results[i].id+"'><a href='#'>" + results[i].name + "</a></li>");
            }

            suggest = $('ul.suggestions li a:contains("' + searchTerm + '")');

            suggest.each(function () {
                var src_str = $(this).html(),
                    term = searchTerm,
                    pattern;

                term = term.replace(/(\s+)/, "(<[^>]+>)*$1(<[^>]+>)*");
                pattern = new RegExp("(" + term + ")", "i");

                src_str = src_str.replace(pattern, "<mark>$1</mark>");
                /*jslint regexp: true */ // - would like to remove this
                src_str = src_str.replace(/(<mark>[^<>]*)((<[^>]+>)+)([^<>]*<\/mark>)/, "$1</mark>$2<mark>$4");

                $(this).html(src_str);
            });
        },

        handleKeyup: function (e) {
            var $target = $(e.currentTarget),
                searchTerm = $.trim($target.val()).toLowerCase(),
                tag,
                populator;

            if (e.keyCode === this.keys.UP) {
                e.preventDefault();
                if (this.$suggestions.is(":visible")) {
                    if (this.$suggestions.children(".selected").length === 0) {
                        this.$suggestions.find("li:last-child").addClass('selected');
                    } else {
                        this.$suggestions.children(".selected").removeClass('selected').prev().addClass('selected');
                    }
                }
            } else if (e.keyCode === this.keys.DOWN) {
                e.preventDefault();
                if (this.$suggestions.is(":visible")) {
                    if (this.$suggestions.children(".selected").length === 0) {
                        this.$suggestions.find("li:first-child").addClass('selected');
                    } else {
                        this.$suggestions.children(".selected").removeClass('selected').next().addClass('selected');
                    }
                }
            } else if (e.keyCode === this.keys.ESC) {
                this.$suggestions.hide();
            } else if ((e.keyCode === this.keys.ENTER || e.keyCode === this.keys.COMMA) && searchTerm) {
                // Submit tag using enter or comma key
                e.preventDefault();

                var $selectedSuggestion = this.$suggestions.children(".selected");
                if (this.$suggestions.is(":visible") && $selectedSuggestion.length !== 0) {

                    if ($('.tag:containsExact("' + $selectedSuggestion.text() + '")').length === 0) {

                        var tag = {id: $selectedSuggestion.data('tag-id'), name: $selectedSuggestion.text()};
                        var $tag = $('<span class="tag" data-tag-id="'+tag.id+'">' + $selectedSuggestion.text() + '</span>');

                        this.$('.tags').append($tag);
                        this.model.addTag(tag);
                    }
                } else {
                    if (e.keyCode === this.keys.COMMA) {
                        searchTerm = searchTerm.replace(/,/g, "");
                    }  // Remove comma from string if comma is used to submit.
                    if ($('.tag:containsExact("' + searchTerm + '")').length === 0) {
                        tag = $('<span class="tag">' + searchTerm + '</span>');
                        this.$('.tags').append(tag);
                        this.model.addTag({id: null, name: searchTerm});
                    }
                }
                $target.val('').focus();
                searchTerm = ""; // Used to reset search term
                this.$suggestions.hide();
            }

            if (e.keyCode === this.keys.UP || e.keyCode === this.keys.DOWN) {
                return false;
            }

            if (searchTerm) {
                this.showSuggestions($target, searchTerm);
            } else {
                this.$suggestions.hide();
            }
        },

        handleKeydown: function (e) {
            var $target = $(e.currentTarget),
                populator,
                lastBlock;
            // Delete character tiggers on Keydown, so needed to check on that event rather than Keyup.
            if (e.keyCode === this.keys.BACKSPACE && !$target.val()) {
                lastBlock = this.$('.tags').find('.tag').last();
                lastBlock.remove();
                var tag = {id: lastBlock.data('tag-id'), name: lastBlock.text()};
                this.model.removeTag(tag);
            }
        },

        handleSuggestionClick: function (e) {
            var $target = $(e.currentTarget),
                tag = $('<span class="tag">' + $(e.currentTarget).text() + '</span>'),
                populator;

            if ($target.parent().data('populate')) {
                populator = $($target.parent().data('populate'));
                populator.append(tag);
                this.$suggestions.hide();
                $('[data-input-behaviour="tag"]').val('').focus();
            }
        },

        handleTagClick: function(e) {
            var $tag = $(e.currentTarget);
            $tag.remove();

            var tag = {id: $tag.data('tag-id'), name: $tag.text()};
            this.model.removeTag(tag);
        },

        findMatchingTags: function (searchTerm) {
            var tags = this.getAllGhostTags();
            searchTerm = searchTerm.toUpperCase();
            return _.filter(tags, function (tag) {
                return tag.name.toUpperCase().indexOf(searchTerm) !== -1;
            });
        },

        selectedSuggestion: function () {

        }
    });

    // The Publish, Queue, Publish Now buttons
    // ----------------------------------------
    ActionsWidget = Ghost.View.extend({

        events: {
            'click [data-set-status]': 'handleStatus',
            'click .js-post-button': 'updatePost'
        },

        statusMap: {
            'draft': 'Save Draft',
            'published': 'Publish Now',
            'scheduled': 'Save Schedued Post',
            'queue': 'Add to Queue',
            'publish-on': 'Publish on...'
        },

        initialize: function () {
            var self = this;
            // Toggle publish
            shortcut.add("Ctrl+Alt+P", function () {
                self.toggleStatus();
            });
            shortcut.add("Ctrl+S", function () {
                self.updatePost();
            });
            shortcut.add("Meta+S", function () {
                self.updatePost();
            });
            this.listenTo(this.model, 'change:status', this.render);
            this.model.on('change:id', function (m) {
                Backbone.history.navigate('/editor/' + m.id);
            });
        },

        toggleStatus: function () {
            var view = this,
                keys = Object.keys(this.statusMap),
                model = this.model,
                prevStatus = this.model.get('status'),
                currentIndex = keys.indexOf(prevStatus),
                newIndex;


            if (keys[currentIndex + 1] === 'scheduled') { // TODO: Remove once scheduled posts work
                newIndex = currentIndex + 2 > keys.length - 1 ? 0 : currentIndex + 1;
            } else {
                newIndex = currentIndex + 1 > keys.length - 1 ? 0 : currentIndex + 1;
            }

            this.savePost({
                status: keys[newIndex]
            }).then(function () {
                Ghost.notifications.addItem({
                    type: 'success',
                    message: 'Your post: ' + model.get('title') + ' has been ' + keys[newIndex],
                    status: 'passive'
                });
            }, function (response) {
                var status = keys[newIndex];
                // Show a notification about the error
                view.reportSaveError(response, model, status);
                // Set the button text back to previous
                model.set({ status: prevStatus });
            });
        },

        setActiveStatus: function setActiveStatus(status, displayText) {
            // Set the publish button's action
            $('.js-post-button')
                .attr('data-status', status)
                .text(displayText);

            // Set the active action in the popup
            $('.splitbutton-save .editor-options li')
                .removeClass('active')
                .filter(['li[data-set-status="', status, '"]'].join(''))
                    .addClass('active');
        },

        handleStatus: function (e) {
            if (e) { e.preventDefault(); }
            var view = this,
                status = $(e.currentTarget).attr('data-set-status');

            view.setActiveStatus(status, this.statusMap[status]);

            // Dismiss the popup menu
            $('body').find('.overlay:visible').fadeOut();
        },

        updatePost: function (e) {
            if (e) { e.preventDefault(); }
            var view = this,
                model = view.model,
                $currentTarget = $(e.currentTarget),
                status = $currentTarget.attr('data-status'),
                prevStatus = model.get('status');

            if (status === 'publish-on') {
                return Ghost.notifications.addItem({
                    type: 'alert',
                    message: 'Scheduled publishing not supported yet.',
                    status: 'passive'
                });
            }
            if (status === 'queue') {
                return Ghost.notifications.addItem({
                    type: 'alert',
                    message: 'Scheduled publishing not supported yet.',
                    status: 'passive'
                });
            }

            view.savePost({
                status: status
            }).then(function () {
                Ghost.notifications.addItem({
                    type: 'success',
                    message: ['Your post "', model.get('title'), '" has been ', status, '.'].join(''),
                    status: 'passive'
                });
            }, function (request) {
                var message = view.getRequestErrorMessage(request) || model.validationError;

                Ghost.notifications.addItem({
                    type: 'error',
                    message: message,
                    status: 'passive'
                });

                model.set({ status: prevStatus });
            });
        },

        savePost: function (data) {
            // TODO: The content_raw getter here isn't great, shouldn't rely on currentView.
            _.each(this.model.blacklist, function (item) {
                this.model.unset(item);
            }, this);

            var saved = this.model.save(_.extend({
                title: $('#entry-title').val(),
                content_raw: Ghost.currentView.editor.getValue()
            }, data));

            // TODO: Take this out if #2489 gets merged in Backbone. Or patch Backbone
            // ourselves for more consistent promises.
            if (saved) {
                return saved;
            }
            return $.Deferred().reject();
        },

        reportSaveError: function (response, model, status) {
            var title = model.get('title') || '[Untitled]',
                message = 'Your post: ' + title + ' has not been ' + status;

            if (response) {
                // Get message from response
                message = this.getErrorMessageFromResponse(response);
            } else if (model.validationError) {
                // Grab a validation error
                message += "; " + model.validationError;
            }

            Ghost.notifications.addItem({
                type: 'error',
                message: message,
                status: 'passive'
            });
        },

        render: function () {
            var status = this.model.get('status');

            this.setActiveStatus(status, this.statusMap[status]);
        }

    });

    // The entire /editor page's route (TODO: move all views to client side templates)
    // ----------------------------------------
    Ghost.Views.Editor = Ghost.View.extend({

        initialize: function () {

            // Add the container view for the Publish Bar
            this.addSubview(new PublishBar({el: "#publish-bar", model: this.model})).render();

            this.$('#entry-markdown').html(this.model.get('content_raw'));

            this.initMarkdown();
            this.renderPreview();

            $('.entry-content header, .entry-preview header').on('click', function () {
                $('.entry-content, .entry-preview').removeClass('active');
                $(this).closest('section').addClass('active');
            });

            $('.entry-title .icon-fullscreen').on('click', function (e) {
                e.preventDefault();
                $('body').toggleClass('fullscreen');
            });

            $('.options.up').on('click', function (e) {
                e.stopPropagation();
                $(this).next("ul").fadeToggle(200);
            });

            this.$('.CodeMirror-scroll').on('scroll', this.syncScroll);

            // Shadow on Markdown if scrolled
            this.$('.CodeMirror-scroll').on('scroll', function (e) {
                if ($('.CodeMirror-scroll').scrollTop() > 10) {
                    $('.entry-markdown').addClass('scrolling');
                } else {
                    $('.entry-markdown').removeClass('scrolling');
                }
            });

            // Shadow on Preview if scrolled
            this.$('.entry-preview-content').on('scroll', function (e) {
                if ($('.entry-preview-content').scrollTop() > 10) {
                    $('.entry-preview').addClass('scrolling');
                } else {
                    $('.entry-preview').removeClass('scrolling');
                }
            });

            // Zen writing mode shortcut
            shortcut.add("Alt+Shift+Z", function () {
                $('body').toggleClass('zen');
            });

            $('.entry-markdown header, .entry-preview header').click(function (e) {
                $('.entry-markdown, .entry-preview').removeClass('active');
                $(e.target).closest('section').addClass('active');
            });

        },

        events: {
            'click .markdown-help': 'showHelp'
        },

        syncScroll: _.debounce(function (e) {
            var $codeViewport = $(e.target),
                $previewViewport = $('.entry-preview-content'),
                $codeContent = $('.CodeMirror-sizer'),
                $previewContent = $('.rendered-markdown'),

                // calc position
                codeHeight = $codeContent.height() - $codeViewport.height(),
                previewHeight = $previewContent.height() - $previewViewport.height(),
                ratio = previewHeight / codeHeight,
                previewPostition = $codeViewport.scrollTop() * ratio;

            // apply new scroll
            $previewViewport.scrollTop(previewPostition);
        }, 50),

        showHelp: function () {
            this.addSubview(new Ghost.Views.Modal({
                model: {
                    options: {
                        close: true,
                        type: "info",
                        style: "wide",
                        animation: 'fadeIn'
                    },
                    content: {
                        template: 'markdown',
                        title: 'Markdown Help'
                    }
                }
            }));
        },

        // This updates the editor preview panel.
        // Currently gets called on every key press.
        // Also trigger word count update
        renderPreview: function () {
            var view = this,
                preview = document.getElementsByClassName('rendered-markdown')[0];
            preview.innerHTML = this.converter.makeHtml(this.editor.getValue());
            view.$('.js-drop-zone').upload({editor: true});
            Countable.once(preview, function (counter) {
                view.$('.entry-word-count').text($.pluralize(counter.words, 'word'));
                view.$('.entry-character-count').text($.pluralize(counter.characters, 'character'));
                view.$('.entry-paragraph-count').text($.pluralize(counter.paragraphs, 'paragraph'));
            });
        },

        // Markdown converter & markdown shortcut initialization.
        initMarkdown: function () {
            this.converter = new Showdown.converter({extensions: ['ghostdown']});
            this.editor = CodeMirror.fromTextArea(document.getElementById('entry-markdown'), {
                mode: 'markdown',
                tabMode: 'indent',
                tabindex: "2",
                lineWrapping: true,
                dragDrop: false
            });

            var view = this;

            // Inject modal for HTML to be viewed in
            shortcut.add("Ctrl+Alt+C", function () {
                view.showHTML();
            });
            shortcut.add("Ctrl+Alt+C", function () {
                view.showHTML();
            });

            _.each(MarkdownShortcuts, function (combo) {
                shortcut.add(combo.key, function () {
                    return view.editor.addMarkdown({style: combo.style});
                });
            });

            this.editor.on('change', function () {
                view.renderPreview();
            });
        },

        showHTML: function () {
            this.addSubview(new Ghost.Views.Modal({
                model: {
                    options: {
                        close: true,
                        type: "info",
                        style: "wide",
                        animation: 'fadeIn'
                    },
                    content: {
                        template: 'copyToHTML',
                        title: 'Copied HTML'
                    }
                }
            }));
        },

        render: function () { return this; }
    });

}());
