/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(function(require, exports, module) {
    "use strict";
    main.consumes = [
        "Plugin", "ace", "commands", "menus", "ui",
        "moz_compare_locales"
    ];
    main.provides = ["moz.transvision"];

    return main;

    function main(options, imports, register) {
        var Plugin = imports.Plugin;
        var ace = imports.ace;
        var commands = imports.commands;
        var menus = imports.menus;
        var ui = imports.ui;
        var cl = imports["moz_compare_locales"];

        /***** Initialization *****/

        var plugin = new Plugin("mozilla.org", main.consumes);

        /***** Methods *****/

        function load() {
            console.log('transvision hooks loaded');
            // Add transvision hook into ace
            commands.addCommand({
                name: "transvisionsearch",
                //bindKey: { mac: "Command-Shift-C", win: "Ctrl-Shift-C" },
                hint: "Search for the selection on transvision",
                isAvailable: function(editor) { 
                    var ace = editor && editor.ace;
                    return ace && !ace.selection.isEmpty() && cl.locale;
                },
                exec: function(editor) { 
                    if (!editor.ace.selection.isEmpty())
                        search(editor.ace.getCopyText());
                }
            }, plugin);
    
            // right click context item in ace
            ace.getElement("menu", function(menu) {
                menus.addItemToMenu(menu, new ui.item({
                    caption: "Search in Transvision",
                    command: "transvisionsearch"
                }), 600, plugin);
            });
        }
        
        function search(selection) {
            var locale = cl.locale;
            if (!locale) return;
            var url = 'https://transvision.mozfr.org/?';
            url += 'repo=global&search_type=strings_entities&sourcelocale=en-US&locale=' + locale;
            url += '&recherche=' + selection;
            window.open(url);
        }

        /***** Lifecycle *****/

        plugin.on("load", function() {
            load();
        });
        plugin.on("unload", function() {
        });

        /***** Register and define API *****/
        plugin.freezePublicAPI({
        });

        register(null, {
            "moz.transvision": plugin
        });
    }
});
