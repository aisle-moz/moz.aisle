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
            var cmd, args = ['--data=json'];
            switch (using.type) {
                case "dirs":
                    cmd = 'compare-dirs';
                    args.push(c9.workspaceDir + using.base + 'en-US');
                    args.push(c9.workspaceDir + using.base + our_settings.locale);
                    break;
                default:
                    cmd = 'compare-locales';
                    args.push(c9.workspaceDir + using.repo + using.ini);
                    args.push(c9.workspaceDir + using.l10n);
                    args.push(our_settings.locale);
            }
            proc.execFile(cmd, {
                args: args,
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
                switch (config.type) {
                    case "dirs":
                        if (path.indexOf(config.base + 'en-US') === 0) {
                            ref = path;
                            found_config = config;
                            return true;
                        }
                        if (path.indexOf(config.base + our_settings.locale) === 0) {
                            l10n = path;
                            found_config = config;
                            return true;
                        }
                        break;
                    default:
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
            var subpath, relpath;
            if (found_config.type === 'app') {
                subpath = l10n.substr(found_config.l10n.length);
                relpath = subpath.split('/').slice(1);
            }
            else {
                subpath = l10n.substr(found_config.base.length + our_settings.locale.length + 1);
                relpath = subpath.split('/');
            }

            function findAppReference(resolve, reject) {
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
            console.log(subpath, 'prior');
            function findDirsReference(resolve, reject) {
                relpath.unshift('en-US');
                resolve(found_config.base + relpath.join('/'));
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
                        return [l10n, new Promise(found_config.type === 'app' ? findAppReference : findDirsReference), child.value];
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
