/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Data handling routines
 * 
 * compare() triggers a compare-locales or -dirs run for the currently
 * selected project.
 * It emits an event on the moz_compare_locales plugin on success.
 * Event type: cl.update
 * Event data: data: json details; using: used settings.
 * 
 * get_data(path) returns the data for a given file.
 * It returns false if this is not a localized file.
 * It returns null if no data is present or found.
 * On success, it returns a tuple of the l10n file, 
 * a Promise to find the en-US reference file and the json data.
 */

define(function(require, exports, module) {
    module.exports = function(plugin, c9, fs, proc, settings) {
        var data, our_settings;
        var emit = plugin.getEmitter();
        function compare() {
            settings.once("read", _compare);
        }
        function _compare() {
            our_settings = settings.getJson("project/moz_compare_locales");
            var using = our_settings.configs[0];
            if (plugin.active) {
                our_settings.configs.forEach(function(config) {
                    if (config.label === plugin.active) {
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
                emit("cl.update", {data: data, using: using});
            });
        }

        function get_data(path) {
            var l10n, ref, found_config;
            if (!settings.inited || !data) {
                compare();
                return null;
            }
            var having_data = our_settings.configs.some(function(config) {
                if (path.indexOf(config.repo) === 0) {
                    ref = path;
                    found_config = config;
                    return true;
                }
                if (path.indexOf(config.l10n + our_settings.locale) === 0) {
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

        return {
            compare: compare,
            get_data: get_data
        };
    };
});
