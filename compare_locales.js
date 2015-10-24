/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(function(require, exports, module) {
    "use strict";
    main.consumes = [
        "Panel", "Datagrid", "layout",
        "fs", "settings", "tabManager", "panels", "ui",
        "c9", "proc"  // only used in ./compare-locales/data.js
    ];
    main.provides = ["moz_compare_locales"];
    return main;

    function main(options, imports, register) {
        var Panel = imports.Panel;
        var Datagrid = imports.Datagrid;
        var layout = imports.layout;
        var panels = imports.panels;
        var settings = imports.settings;
        var tabs = imports.tabManager;
        var ui = imports.ui;
        var fs = imports.fs;
        var panelIndex = options.index || 250;

        var markup = require('text!./compare-locales/panel.xml');
        var our_settings, dropdown, data;

        /***** Initialization *****/

        function onSettings() {
            our_settings = settings.getJson("project/moz_compare_locales");
            drawDropDown();
        }
        settings.on("read", onSettings, plugin);
        settings.on("project/moz_compare_locales", onSettings, plugin);

        var plugin = new Panel("mozilla.org", main.consumes, {
            index: panelIndex,
            caption: "Compare"
        });
        var emit = plugin.getEmitter();
        var container, tree;
        var Data = require('./compare-locales/data')(
            plugin, imports.c9, fs, imports.proc, settings
        );

        function load() {
            console.log('compare-locales loaded');
            fs.on('afterWriteFile', onDiskChange);
            fs.on('afterRmfile', onDiskChange);
            layout.on('resize', function() {
                tree && tree.resize();
            });
        }

        function onDiskChange(event) {
            if (!our_settings) return;
            var p = event.path;
            var do_run = our_settings.configs.some(function(c) {
                if (p.indexOf(c.repo) === 0) {
                    return true;
                }
                var l10nbase = c.l10n;
                return p.indexOf(l10nbase + our_settings.locale) === 0;
            });
            if (do_run) {
                Data.compare();
            }
        }

        plugin.on('cl.update', function(e) {
            data = e.data;
            if (!tree) {
                return;
            }
            var root = {
                label: e.using.l10n || (e.using.base + our_settings.locale),
                isOpen: true,
                items: []
            };
            function fillChildren(children, node) {
                if (!children || !children.length) return;
                node.items = [];
                children.forEach(function(childtpl) {
                    var label = childtpl[0];
                    var details = childtpl[1];
                    var child = {
                        label: label,
                        isOpen: true
                    };
                    if (details.value) {
                        child.details = details.value;
                        if (details.value.missingEntity) {
                            child.missing = details.value.missingEntity.length;
                        }
                        if (details.value.warning) {
                            child.warnings = details.value.warning.length;
                        }
                        if (details.value.error) {
                            child.errors = details.value.error.length;
                        }
                        if (details.value.missingFile) {
                            child.missingFile = true;
                            child.missing = details.value.strings;
                        }
                        if (details.value.obsoleteEntity) {
                            child.obsolete = details.value.obsoleteEntity.length;
                        }
                        if (details.value.obsoleteFile) {
                            child.obsoleteFile = true;
                        }
                    }
                    if (details.children) {
                        fillChildren(details.children, child);
                    }
                    node.items.push(child);
                });
            }
            fillChildren(data.details.children, root);
            tree.setRoot(root);
        });

        plugin.on("draw", function(e){
            // Insert css
            ui.insertCss(require('text!./style/compare.less'), options.staticPrefix, plugin);
            ui.insertCss(require('text!./style/open-iconic.less'), options.staticPrefix, plugin);
            // Insert markup
            ui.insertMarkup(e.aml, markup, plugin);
            container = plugin.getElement("container");
            dropdown = plugin.getElement("project");
            dropdown.on('afterselect', function() {
                console.log('afterchange calls compare', arguments);
                settings.set('state/moz_compare_locales/selected',
                    dropdown.selected && dropdown.selected.caption || null);
                Data.compare();
            });

            tree = new Datagrid({
                container: container.$int,

                columns : [
                    {
                        caption: "Path",
                        value: "name",
                        defaultValue: "Scope",
                        width: "100%",
                        type: "tree"
                    },
                    {
                        caption: "-",
                        getText: function(node) {
                            return node.missing || '';
                        },
                        width: "25",
                    },
                    {
                        caption: "?",
                        getText: function(node) {
                            return node.obsolete || '';
                        },
                        width: "25",
                    }
                ],

                getIconHTML: function(node) {
                    var h = '';
                    if (node.items && node.items.length) {
                        // TODO:
                        // h += '<span class="filetree-icon folder"></span>'
                    }
                    if (node.missingFile) {
                        h += '<span class="cl-tree-icon cl-tree-add oi" data-glyph="plus"></span>';
                    }
                    if (node.obsoleteFile) {
                        h += '<span class="cl-tree-icon cl-tree-obsolete oi" data-glyph="minus"></span>';
                    }
                    if (node.errors) {
                        h += '<span class="cl-tree-icon cl-tree-error oi" data-glyph="bolt"></span>';
                    }
                    if (node.warnings) {
                        h += '<span class="cl-tree-icon cl-tree-warning oi" data-glyph="warning"></span>';
                    }
                    return h;
                }
            }, plugin);
            tree.on('afterChoose', function(e, some) {
                var nodes = tree.selection.getSelectedNodes();
                var active = tree.selection.getCursor();
                var l10n_pane = getL10nPane();
                nodes.forEach(function(node) {
                    var path = node.label;
                    var parent = node.parent;
                    while (parent) {
                        path = parent.label + '/' + path;
                        parent = parent.parent;
                    }
                    if (!node.missingFile) {
                        var tab = tabs.open({
                            path: path,
                            active: node === active,
                            pane: l10n_pane
                        });
                        panels.activate('moz_compare_file');
                        return tab;
                    }
                    // now it's getting async, we need to create the file first
                    // first, we might need the dir
                    var dir = path.substring(0, path.lastIndexOf('/'));
                    fs.mkdirP(dir, function(err) {
                        console.log('mkdirP', err);
                        fs.writeFile(path, '', function(err) {
                            console.log('writeFile', err);
                            tabs.open({
                                path: path,
                                active: node === active,
                                pane: l10n_pane
                            });
                            panels.activate('moz_compare_file');
                        });
                    });
                });
            });
            drawDropDown();
            Data.compare();
        });

        /***** Methods *****/

        function drawDropDown() {
            if (!our_settings || !dropdown) return;
            while (dropdown.visible && dropdown.childNodes.length) {
                dropdown.removeChild(dropdown.childNodes[0]);
            }
            if (our_settings.configs.length === 1) {
                dropdown.hide();
                return;
            }
            dropdown.show();
            our_settings.configs.forEach(function(config) {
                dropdown.appendChild(new ui.item({
                    caption: config.label
                }));
            });
            var using = dropdown.childNodes[0];
            var state = settings.get('state/moz_compare_locales/selected');
            if (state) {
                dropdown.childNodes.forEach(function(node) {
                    if (node.caption === state) {
                        using = node;
                    }
                });
            }
            dropdown.select(using);
        }

        function getL10nPane() {
            return tabs.getPanes()[0];
        }

        function getEnPane() {
            var panes = tabs.getPanes();
            if (panes.length < 2) {
                panes[0].vsplit(true);
                panes = tabs.getPanes();
            }
            return panes[1];
        }

        /***** Lifecycle *****/

        plugin.on("load", function() {
            load();
        });
        plugin.on("unload", function() {
            tree = container = dropdown = data = null;
            our_settings = null;
        });

        // XXX Hack, make sure that container is shown, and resize just in case
        plugin.on("show", function(e) {
            container.show();
            if (!tree) return;
            setTimeout(tree.resize.bind(tree), 100);
        });

        /***** Register and define API *****/

        plugin.freezePublicAPI({
            get setting() { return our_settings; },
            get tree() { return tree; },
            get active() {
                return dropdown && dropdown.selected ?
                    dropdown.selected.caption : null;
            },
            get_data: Data.get_data,
            getL10nPane: getL10nPane,
            getEnPane: getEnPane,
            _events: [
                /**
                 * Fires when new compare-locales data is available
                 **/
                "cl.update"
            ]
        });

        register(null, {
            "moz_compare_locales": plugin
        });
    }
});
