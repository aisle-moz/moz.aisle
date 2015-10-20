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
        var our_settings, dropdown, data, shouldCompare=false;

        /***** Initialization *****/

        function onSettings() {
            our_settings = settings.getJson("project/moz_compare_locales");
            // ensure all config directories end in '/'
            our_settings.configs.forEach(function(config) {
                if (config.l10n.substr(-1) !== '/') {
                    config.l10n += '/';
                }
                if (config.repo.substr(-1) !== '/') {
                    config.repo += '/';
                }
            });
            drawDropDown();
            if (shouldCompare) {
                compare();
            }
        }
        settings.on("read", onSettings, plugin);
        settings.on("project/moz_compare_locales", onSettings, plugin);

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
            if (!our_settings) return;
            var p = event.path;
            var do_run = our_settings.configs.some(function(c) {
                if (p.indexOf(c.repo) == 0) {
                    return true;
                }
                var l10nbase = c.l10n;
                return p.indexOf(l10nbase + our_settings.locale) == 0;
            });
            if (do_run) {
                compare();
            }
        }

        function compare() {
            if (!our_settings) return;
            var using = our_settings.configs[0];
            if (dropdown && dropdown.visible && dropdown.selected) {
                our_settings.configs.forEach(function(config) {
                    if (config.label === dropdown.selected.caption) {
                        using = config;
                    }
                });
            }
            proc.execFile("compare-locales", {
                args: [
                    '--data=json',
                    c9.workspaceDir + using.repo + using.ini,
                    c9.workspaceDir + using.l10n,
                    our_settings.locale
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
                    label: using.l10n,
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
            if (!our_settings || !data) {
                compare();
                shouldCompare = true;
                return null;
            }
            var having_data = our_settings.configs.some(function(config) {
                if (path.indexOf(config.repo) == 0) {
                    ref = path;
                    found_config = config;
                    return true;
                }
                if (path.indexOf(config.l10n + our_settings.locale) == 0) {
                        l10n = path;
                        found_config = config;
                        return true;
                }
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
                    _p = found_config.repo + segs.join('/');
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
            dropdown = plugin.getElement("project");
            dropdown.on('afterselect', function() {
                console.log('afterchange calls compare', arguments);
                settings.set('state/moz_compare_locales/selected',
                    dropdown.selected && dropdown.selected.caption || null);
                compare();
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
            drawDropDown();
            compare();
        });

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

        // XXX Hack, make sure that container is shown, and resize just in case
        plugin.on("show", function(e) {
            container.show();
            if (!tree) return;
            setTimeout(tree.resize.bind(tree), 100);
        });
        
        /***** Lifecycle *****/

        plugin.on("load", function() {
            load();
        });
        plugin.on("unload", function() {
            tree = container = dropdown = data = null;
            our_settings = shouldCompare = null;
        });

        /***** Register and define API *****/

        plugin.freezePublicAPI({
            get setting() { return our_settings; },
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
