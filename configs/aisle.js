module.exports = function(config, optimist) {
    var plugins = require('./standalone')(config, optimist);
    // allow aisle to load itself
    plugins.forEach(function(plugin) {
        if (plugin.packagePath == "./c9.ide.server/plugins") {
            plugin.whitelist["moz.aisle"] = true;
        }
    });
    return plugins;
};
