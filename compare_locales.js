/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(function(require, exports, module) {
    "use strict";
    main.consumes = ["Panel", "Form", "Datagrid",
        "c9", "fs", "layout", "proc", "settings", "tabManager", "ui", "vfs"];
    main.provides = ["moz_compare_locales"];
    return main;

    function main(options, imports, register) {
        var Panel = imports.Panel;
        var Datagrid = imports.Datagrid;
        var Form = imports.Form;
        var c9 = imports.c9;
        var layout = imports.layout;
        var proc = imports.proc;
        var settings = imports.settings;
        var tabs = imports.tabManager;
        var ui = imports.ui;
        var vfs = imports.vfs;
        var fs = imports.fs;
        var panelIndex = options.index || 250;

        var markup = require('text!./compare-locales/panel.xml');
        var configs, data, shouldCompare=false;

        /***** Initialization *****/

        settings.on("read", function(){
            /* settings.setJson("project/moz.compare.locales", [
                {
                    "l10n": "/",
                    "locales": ["de"],
                    "l10nini": ["/mozilla-aurora/", "browser/locales/l10n.ini"]
                }
            ]); */
            configs = settings.getJson("project/moz_compare_locales");
            // ensure all config directories end in '/'
            configs.forEach(function(config) {
                if (config.l10n.substr(-1) !== '/') {
                    config.l10n += '/';
                }
                if (config.l10nini[0].substr(-1) !== '/') {
                    config.l10nini[0] += '/';
                }
            });
            if (shouldCompare) {
                compare();
            }
        }, plugin);

        var plugin = new Panel("mozilla.org", main.consumes, {
            index: panelIndex,
            caption: "Compare"
        });
        var emit = plugin.getEmitter();
        var container, tree;

        function load() {
            console.log('compare-locales loaded');
            fs.on('afterWriteFile', onDiskChange);
            fs.on('afterRmfile', onDiskChange);
            layout.on('resize', function() {
                tree && tree.resize();
            });
        }

        function onDiskChange(event) {
            if (!configs) return;
            var p = event.path;
            var do_run = configs.some(function(c) {
                if (p.indexOf(c.l10nini[0]) == 0) {
                    return true;
                }
                var l10nbase = c.l10n;
                return c.locales.some(function(loc) {
                    return p.indexOf(l10nbase + loc) == 0;
                });
            });
            if (do_run) {
                compare();
            }
        }

        function compare() {
            if (!configs) return;
            proc.execFile("compare-locales", {
                args: [
                    '--data=json',
                    c9.workspaceDir + configs[0].l10nini.join(''),
                    c9.workspaceDir + configs[0].l10n,
                    configs[0].locales[0]
                ],
                cwd: c9.workspaceDir,
                stdoutEncoding: 'utf8',
                stderrEncoding: 'utf8'
            }, function(err, stdout, stderr) {
                if (err) return console.error(err);
                data = JSON.parse(stdout);
                emit("cl.update");
                if (!tree) {
                    return;
                }
                var root = {
                    label: configs[0].l10n,
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
        }

        function get_data(path) {
            var l10n, ref, found_config;
            if (!configs || !data) {
                compare();
                shouldCompare = true;
                return null;
            }
            var having_data = configs.some(function(config) {
                if (path.indexOf(config.l10nini[0]) == 0) {
                    ref = path;
                    found_config = config;
                    return true;
                }
                return config.locales.some(function(loc) {
                    if (path.indexOf(config.l10n + loc) == 0) {
                        l10n = path;
                        found_config = config;
                        return true;
                    }
                });
            });
            if (!having_data) {
                return null;
            }
            console.log(found_config, l10n, ref, 'found config');
            if (!l10n) {
                return false;
            }

            // strip leading l10nbase.
            var subpath = l10n.substr(found_config.l10n.length);
            var relpath = subpath.split('/').slice(1);
            function findReference(resolve, reject) {
                var offset = 1;
                function exists() {
                    var _p, segs = relpath.concat([]);  // copy
                    segs.splice(offset, 0, 'locales', 'en-US');
                    _p = found_config.l10nini[0] + segs.join('/');
                    console.log('trying reference', _p);
                    fs.exists(_p, function(found) {
                        if (found) {
                            resolve(_p);
                            return;
                        }
                        ++offset;
                        if (offset >= relpath.length) {
                            reject({msg: 'no reference found', path: path});
                            return;
                        }
                        exists();
                    });
                }
                exists();
            }
            var node = data.details;
            while (subpath && node) {
                if (!node.children) {
                    return null;
                }
                for (var i=0, ii=node.children.length; i < ii; ++i) {
                    var leaf = node.children[i][0];
                    var child = node.children[i][1];
                    if (subpath === leaf) {
                        return [l10n, new Promise(findReference), child.value];
                    }
                    if (subpath.indexOf(leaf + '/') === 0) {
                        subpath = subpath.substr(leaf.length + 1);
                        node = child;
                        break;
                    }
                }
                if (i === ii) {
                    return null;  // not found
                }
            }
        }

        /***** Methods *****/


        plugin.on("draw", function(e){
            // Insert css
            ui.insertCss(require('text!./style/compare.less'), options.staticPrefix, plugin);
            ui.insertCss(require('text!./style/open-iconic.less'), options.staticPrefix, plugin);
            // Insert markup
            ui.insertMarkup(e.aml, markup, plugin);
            container = plugin.getElement("container");

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
                var panes = tabs.getPanes();
                var l10n_pane = panes[0];
                var en_US_pane = panes[1];
                nodes.forEach(function(node) {
                    var path = node.label;
                    var parent = node.parent;
                    while (parent) {
                        path = parent.label + '/' + path;
                        parent = parent.parent;
                    }
                    if (!node.missingFile) {
                        return tabs.open({
                            path: path,
                            active: node === active,
                            pane: l10n_pane
                        });
                    }
                    // now it's getting async, we need to create the file first
                    // first, we might need the dir
                    var dir = path.substring(0, path.lastIndexOf('/'));
                    fs.mkdirP(dir, function(err) {
                        console.log('mkdirP', err);
                        fs.writeFile(path, '', function(err) {
                            console.log('writeFile', err);
                            tabs.openFile(path, node === active);
                        });
                    });
                });
            });
            compare();
        });

        /***** Lifecycle *****/

        plugin.on("load", function() {
            load();
        });
        plugin.on("unload", function() {
            tree = container = data = null;
            configs = shouldCompare = null;
        });

        /***** Register and define API *****/

        plugin.freezePublicAPI({
            get configs() { return configs; },
            get tree() { return tree; },
            get_data: get_data,
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