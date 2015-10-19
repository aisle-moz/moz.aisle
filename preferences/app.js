define(function(require, exports, module) {
    var EventEmitter = require("events").EventEmitter;
    module.exports = function(ui, dialog_file, dialog_alert) {
        function AppUI(config) {
            var emitter = new EventEmitter();
            this.config = config;
            this.getEventEmitter = function() {
                return emitter;
            };
            this.savePrefs = function() {
                emitter.emit("configchange");
            };
        }
        
        AppUI.prototype = {
            /**
             * UI Creation
             **/
            createNodes: function() {
                var container = new ui.vbox({
                    'class': 'config app'
                });
                var labelbox = container.appendChild(this.createLabelUI());
                labelbox.appendChild(new ui.filler({}));
                labelbox.appendChild(this.createRemoveButton());
                container.appendChild(this.createBaseUI());
                container.appendChild(this.createIniUI());
                container.appendChild(new ui.divider({
                        skin:"c9-divider-hor",
                        margin:"5 0 5 0"
                }));
                this.$container = container;
                container.getConfig = this.getConfig.bind(this);
                return container;
            },
            createLabelUI: function() {
                var that = this;
                this.$label = new ui.textbox({
                    caption: this.config.label || '',
                    skin: 'textbox',
                    width: 200,
                    margin: "-3 0 0 0",
                    value: this.config.label,
                    'initial-message': 'Project label',
                    onblur: that.savePrefs
                });
                return new ui.hbox({
                    height: 40,
                    childNodes: [
                        new ui.label({
                            caption: 'Label: ',
                            width: 100
                        }),
                        this.$label
                    ]
                });
            },
            createRemoveButton: function() {
                var that = this;
                return new ui.button({
                    caption: 'Remove!',
                    skin: 'btn-default-css3',
                    "class": "btn-red",
                    height: 24,
                    margin: "-2 10 -2 0",
                    onclick: function() {
                        if (that.$container.parentNode) {
                            that.$container.parentNode.removeChild(that.$container);
                            that.savePrefs();
                        }
                    }
                });
            },
            createBaseUI: function() {
                this.$l10n = new ui.button({
                    caption: this.config.l10n || '',
                    skin: 'blackbutton',
                    height: 24,
                    margin: "-2 0 -2 0",
                    style: "line-height:22px",
                    onclick: this.onL10nClick.bind(this)
                });
                return new ui.hbox({
                    height: 40,
                    childNodes: [
                        new ui.label({
                            caption: 'L10n base: ',
                            width: 100
                        }),
                        this.$l10n
                    ]
                });
            },
            createIniUI: function() {
                this.$repo = new ui.button({
                    caption: this.config.repo || '/',
                    skin: 'blackbutton',
                    height: 24,
                    margin: "-2 0 -2 0",
                    style: "line-height:22px",
                    onclick: this.onRepoClick.bind(this)
                });
                this.$ini = new ui.button({
                    caption: this.config.ini || '',
                    skin: 'blackbutton',
                    height: 24,
                    margin: "-2 0 -2 0",
                    style: "line-height:22px",
                    onclick: this.onIniClick.bind(this)
                });
                return new ui.hbox({
                    height: 40,
                    childNodes: [
                        new ui.label({
                            caption: 'l10n.ini: ',
                            width: 100
                        }),
                        this.$repo,
                        this.$ini
                    ]
                });
            },
            /**
             * Interaction
             */
            onL10nClick: function (e) {
                var that = this;
                var button = this.$l10n;
                var currentPath = button.caption;
                dialog_file.show('Select l10n repo base', currentPath,
                function(directory, stat, hide) {
                    if (directory !== '/') directory += '/';
                    button.setCaption(directory);
                    hide();
                    that.savePrefs();
                },
                function() {},
                {
                    chooseCaption: "Select",
                    createFolderButton: false,
                    hideFileInput: true
                });
            },
            onRepoClick: function (e) {
                var that = this;
                var button = this.$repo;
                var currentPath = button.caption;
                dialog_file.show('Select en-US repository', currentPath,
                function(directory, stat, hide) {
                    if (directory !== '/') directory += '/';
                    button.setCaption(directory);
                    hide();
                    that.savePrefs();
                },
                function() {},
                {
                    chooseCaption: "Select",
                    createFolderButton: false,
                    hideFileInput: true
                });
            },
            onIniClick: function (e) {
                var that = this;
                var button = this.$ini;
                var repo = this.$repo.caption;
                var currentPath = repo + (button.caption || 'l10n.ini');
                dialog_file.show('Select repository', currentPath,
                function(path, stat, hide) {
                    if (stat === false || path.substr(0, repo.length) !== repo) {
                        hide();
                        dialog_alert.show('l10n.ini',
                            'Ini file not in repository',
                            'The l10n.ini file needs to be in the chosen repo.');
                        return;
                    }
                    button.setCaption(path.substr(repo.length));
                    hide();
                    that.savePrefs();
                },
                function() {},
                {
                    chooseCaption: "Select",
                    createFolderButton: false
                });
            },
            /**
             * Data retrieval
             */
            getConfig: function() {
                return {
                    type: 'app',
                    label: this.$label ? this.$label.value : '',
                    repo: this.$repo && this.$repo.caption || '/',
                    ini: this.$ini && this.$ini.caption || 'l10n.ini',
                    l10n: this.$l10n && this.$l10n.caption || '/',
                };
            }
        };
        
        return {
            AppUI: AppUI
        };
    };
});
