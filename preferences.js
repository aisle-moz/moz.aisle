/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(function(require, exports, module) {
    "use strict";
    main.consumes = [
        "PreferencePanel", "fs", "ui", "dialog.alert", "dialog.file", "settings",
        "preferences", "c9"
    ];
    main.provides = ["moz.aisle.preferences"];
    return main;

    function main(options, imports, register) {
        var PreferencePanel = imports.PreferencePanel;
        var prefs = imports.preferences;
        var settings = imports.settings;
        var ui = imports.ui;
        var AppUI = require('./preferences/app')(
            ui,
            imports.fs,
            imports['dialog.file'],
            imports['dialog.alert']
        ).AppUI;
        var DirsUI = require('./preferences/dirs')(
            ui,
            imports.fs,
            imports['dialog.file'],
            imports['dialog.alert']
        ).DirsUI;
        var c9 = imports.c9;

        var markup = require('text!./preferences.xml');

        /***** Initialization *****/

        var plugin = new PreferencePanel("mozilla.org", main.consumes, {
            caption: "Aisle",
            form: false,
            index: 450
        });
        var emit = plugin.getEmitter();

        var container;

        var loaded = false;
        function load() {
            if (loaded) return false;
            loaded = true;
        }

        var drawn = false;
        function draw(e) {
            if (drawn) return;
            drawn = true;

            ui.insertMarkup(e.aml, markup, plugin);
            container = plugin.getElement("aisleprefs");
            plugin.getElement("btnAddCompareLocales")
                .on("click", addConfig.bind(null, {type: "app"}));
            plugin.getElement("btnAddCompareDirs")
                .on("click", addConfig.bind(null, {type: "dirs"}));

            settings.once("read", function() {
                var our_settings = settings.getJson("project/moz_compare_locales");
                our_settings.configs.forEach(addConfig);
                var locale_box = container.querySelector('.locale');
                locale_box.setValue(our_settings.locale);
                locale_box.on('blur', savePrefs);
            });

        }

        /***** Monkeys *****/
        /**
         * These only work for class-based selectors.
         * Things like ID or attribute selectors don't work,
         * because apf doesn't mirror all those attributes down to
         * its $ext.
         **/
        apf.AmlElement.prototype.querySelector = function(sel) {
            return this.$ext.querySelector(sel).host;
        };
        apf.AmlElement.prototype.querySelectorAll = function(sel) {
            return Array.prototype.filter.call(
                Array.prototype.map.call(this.$ext.querySelectorAll(sel),
                    function($ext) {return $ext.host;}
                ), function(host) {return host;}
            );
        };

        /***** Methods *****/

        function savePrefs() {
            var locale = container.querySelector('.locale').value;
            var config_containers = container.querySelectorAll('.config');
            var configs = [];
            config_containers.forEach(function(node) {
                configs.push(node.getConfig());
            });
            var new_settings = {
                locale: locale,
                configs: configs
            };
            settings.setJson("project/moz_compare_locales", new_settings);
            return new_settings;
        }

        function addConfig(config) {
            var configUI;
            switch (config.type) {
                case "app":
                    configUI = new AppUI(config);
                    break;
                case "dirs":
                    configUI = new DirsUI(config);
                    break;
                default:
                    throw "Need to pass a config.type to addConfig";
            }
            configUI.getEventEmitter().on('configchange', savePrefs);
            var node = configUI.createNodes();
            container.appendChild(node);
            plugin.addElement(node);
        }

        /***** Lifecycle *****/

        plugin.on("load", function() {
            load();
        });
        plugin.on("draw", function(e) {
            draw(e);
        });
        plugin.on("unload", function() {
            loaded = false;
            drawn = false;
            container = null;
        });

        /***** Register and define API *****/

        /**
         *
         **/
        plugin.freezePublicAPI({
            _events: [

            ],

            /**
             *
             */
             savePrefs : savePrefs,
             addConfig: addConfig,
             AppUI: AppUI,
             DirsUI: DirsUI
        });

        register(null, {
            "moz.aisle.preferences": plugin
        });
    }
});

