/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(function(require, exports, module) {
    var EventEmitter = require("events").EventEmitter;
    module.exports = function(ui, fs, dialog_file, dialog_alert) {
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
                    caption: this.config.l10n || '/',
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
                this.$repo = this.config.repo || '/',
                this.$ini = new ui.button({
                    caption: this.$repo + (this.config.ini || 'l10n.ini'),
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
            onIniClick: function (e) {
                var button = this.$ini;
                var repo = this.$repo;
                var currentPath = button.caption || (repo + 'l10n.ini');
                dialog_file.show('Select repository', currentPath,
                this.onChooseIni.bind(this),
                function() {},
                {
                    chooseCaption: "Select",
                    createFolderButton: false
                });
            },
            onChooseIni: function(path, stat, hide) {
                var that = this;
                if (stat === false) {
                    hide();
                    dialog_alert.show('l10n.ini',
                        'Ini file does not exist',
                        'Please select an existing file.'
                    );
                    return;
                }
                fs.readFile(path, function(err, content) {
                    if (err) {
                        hide();
                        console.log(err);
                        return;
                    }
                    var lines = content.split('\n');
                    var depth, offset = lines.indexOf('[general]') + 1;
                    for (var i=offset, ii=lines.length; i<ii; ++i) {
                        var match = /depth\s*[=:]\s*(.*)/.exec(lines[i]);
                        if (match) {
                            depth = match[1];
                            break;
                        }
                    }
                    var path_segments = path.split('/'), ini_segments = [];
                    var depth_segments = depth.split('/');
                    ini_segments.unshift(path_segments.pop());
                    while (depth_segments.pop() === '..') {
                        ini_segments.unshift(path_segments.pop());
                    }
                    path_segments.push('');
                    that.$repo = path_segments.join('/');
                    that.$ini.setCaption(that.$repo + ini_segments.join('/'));
                    hide();
                    that.savePrefs();
                });
            },
            /**
             * Data retrieval
             */
            getConfig: function() {
                return {
                    type: 'app',
                    label: this.$label ? this.$label.value : '',
                    repo: this.$repo,
                    ini: this.$ini && (this.$ini.caption.substr(this.$repo.length)) || 'l10n.ini',
                    l10n: this.$l10n && this.$l10n.caption || '/',
                };
            }
        };
        
        return {
            AppUI: AppUI
        };
    };
});
