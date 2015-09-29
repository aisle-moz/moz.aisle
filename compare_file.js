/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(function(require, exports, module) {
    "use strict";
    main.consumes = ["Panel", "Form", "List",
        "moz_compare_locales",
        "c9", "fs", "layout", "proc", "tabManager", "ui", "vfs"];
    main.provides = ["moz_compare_file"];
    return main;

    function main(options, imports, register) {
        var Panel = imports.Panel;
        var List = imports.List;
        var Form = imports.Form;
        var c9 = imports.c9;
        var layout = imports.layout;
        var proc = imports.proc;
        var tabs = imports.tabManager;
        var ui = imports.ui;
        var vfs = imports.vfs;
        var fs = imports.fs;
        var cl = imports.moz_compare_locales;
        var panelIndex = options.index || 251;
        var minWidth = options.minWidth || 300;

        var markup = require('text!./compare-locales/file-panel.xml');

        var tree, container, l10nfile, reffile, data;

        var plugin = new Panel("mozilla.org", main.consumes, {
            index: panelIndex,
            minWidth: minWidth,
            caption: "File"
        });

        /***** Methods *****/

        plugin.on("draw", function(e){
            // Insert css
            ui.insertCss(require('text!./style/compare.less'), options.staticPrefix, plugin);
            ui.insertCss(require('text!./style/open-iconic.less'), options.staticPrefix, plugin);
            // Insert markup
            ui.insertMarkup(e.aml, markup, plugin);
            container = plugin.getElement("container");

            tree = new List({
                container: container.$int,
                emptyMessage: "No comparison found",
                rowHeight: 30,
                dataType: "object",
                renderRow: function(row, html, config) { 
                    var node = this.root.items[row];
                    var isSelected = this.isSelected(node);
                    var classes = ['cl-file-entry', 'cl-' + node.kind];
                    if (isSelected) classes.push('selected');
                    html.push("<div class='" + classes.join(' ') + "'>");
                    html.push(node.label.replace('&', '&amp;').replace('<', '&lt;'));
                    html.push('</div>');
                }
            }, plugin);

            tree.on('select', function(e, some) {
                var active = tree.selection.getCursor();
                if (active.kind === 'heading') {
                    console.log('heading selected', e, some);
                }
                if (active.kind === 'obsoleteEntity' && active.key) {
                    var tab = tabs.focussedTab;
                    if (tab && tab.editor && tab.editor.ace) {
                        tab.editor.ace.find(active.key, {backwards: true});
                    }
                }
                if (active.kind === 'missingEntity' && active.key && reffile) {
                    var tab = tabs.findTab(reffile);
                    if (tab && tab.editor && tab.editor.ace) {
                        tab.editor.ace.find(active.key, {
                            backwards: true,
                            start: {row: tab.editor.ace.session.getLength()}
                        });
                    }
                }
            });
            update();
        });

        // XXX Hack, make sure that container is shown, and resize just in case
        plugin.on("show", function(e) {
            container.show();
            if (!tree) return;
            setTimeout(tree.resize.bind(tree), 100);
        });
        
        function set_model() {
            if (!tree) return;
            var items = [];
            if (!data) {
                tree.setRoot();
                tree.model.hideAllNodes();
                return;
            }
            if (data.error) {
                items.push({label: "Errors", kind: 'heading'});
                data.error.forEach(function (desc) {
                    items.push({label: desc, kind: 'error'});
                });
            }
            if (data.missingEntity) {
                items.push({label: "Missing", kind: 'heading'});
                data.missingEntity.forEach(function(key) {
                    items.push({label: key, key:key, kind: 'missingEntity'});
                });
            }
            if (data.warning) {
                items.push({label: "Warnings", kind: 'heading'});
                data.warning.forEach(function (desc) {
                    items.push({label: desc, kind: 'warning'});
                });
            }
            if (data.obsoleteEntity) {
                items.push({label: "Obsolete", kind: 'heading'});
                data.obsoleteEntity.forEach(function(key) {
                    items.push({label: key, key: key, kind: 'obsoleteEntity'});
                });
            }
            tree.setRoot(items);
            tree.model.showAllNodes();
        }


        function load() {
            console.log('compare-file loaded');
            tabs.on("tabAfterActivate", update);
            cl.on("cl.update", update);
            layout.on('resize', function() {
                tree && tree.resize();
            });
        }

        function update(e) {
            var tab = (e && e.tab) || tabs.focussedTab;
            if (tab && tab.path) {
                console.log('file requesting data for ' + tab.path);
                if (tab.path === reffile) return;  // we know this
                var tpl = cl.get_data(tab.path);
                if (tpl === false) {
                    return;
                }
                if (tpl) {
                    data = tpl[2];
                    l10nfile = tpl[0];
                    if (tpl[1]) {
                        tpl[1].then(function(_r) {
                            reffile = _r;
                            ensureRefOpened();
                        })
                            .catch(console.log.bind(console));
                    }
                    set_model();
                }
            }
            else {
                l10nfile = reffile = data = undefined;
                set_model();
            }
        }

        function ensureRefOpened() {
            if (!reffile) return;
            var tab = tabs.findTab(reffile);
            if (tab) {
                tab.activate();
            }
            if (!tab) {
                var panes = tabs.getPanes();
                tabs.open({
                    path: reffile,
                    pane: panes[panes.length - 1],
                    focus: false,
                    active: true
                }, function(_t) {});
            }
        }

        /***** Lifecycle *****/

        plugin.on("load", function() {
            load();
        });
        plugin.on("unload", function() {
            tree = container = data = null;
            l10nfile = null;
        });

        /***** Register and define API *****/
        plugin.freezePublicAPI({
            get tree() { return tree; }
        });

        register(null, {
            "moz_compare_file": plugin
        });
    }
});
