/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(function(require, exports, module) {
    var EventEmitter = require("events").EventEmitter;
    module.exports = function(ui, fs, dialog_file, dialog_alert) {
        function DirsUI(config) {
            var emitter = new EventEmitter();
            this.config = config;
            this.getEventEmitter = function() {
                return emitter;
            };
            this.savePrefs = function() {
                emitter.emit("configchange");
            };
        }
        
        DirsUI.prototype = {
            /**
             * UI Creation
             **/
            createNodes: function() {
                var container = new ui.vbox({
                    'class': 'config dirs'
                });
                var labelbox = container.appendChild(this.createLabelUI());
                labelbox.appendChild(new ui.filler({}));
                labelbox.appendChild(this.createRemoveButton());
                container.appendChild(this.createBaseUI());
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
                this.$base = new ui.button({
                    caption: this.config.base || '/',
                    skin: 'blackbutton',
                    height: 24,
                    margin: "-2 0 -2 0",
                    style: "line-height:22px",
                    onclick: this.onBaseClick.bind(this)
                });
                return new ui.hbox({
                    height: 40,
                    childNodes: [
                        new ui.label({
                            caption: 'Base directory: ',
                            width: 100
                        }),
                        this.$base
                    ]
                });
            },
            /**
             * Interaction
             */
            onBaseClick: function (e) {
                var that = this;
                var button = this.$base;
                var currentPath = button.caption;
                dialog_file.show('Select base directory', currentPath,
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
            /**
             * TODO: use for verification
             */
            onChooseBase: function(path, stat, hide) {
                var that = this;
                if (stat === false) {
                    hide();
                    dialog_alert.show('Base directory',
                        "Base directory doesn't contain en-US or your locale",
                        'Please select a directory.'
                    );
                    return;
                }
            },
            /**
             * Data retrieval
             */
            getConfig: function() {
                return {
                    type: 'dirs',
                    label: this.$label ? this.$label.value : '',
                    base: this.$base && this.$base.caption || '/',
                };
            }
        };
        
        return {
            DirsUI: DirsUI
        };
    };
});
