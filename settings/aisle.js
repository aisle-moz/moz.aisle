module.exports = function(manifest, installPath) {
    var config = require('./standalone')(manifest, installPath);
    config.client_config = 'aisle';
    console.log('aisle settings set up');
    return config;
}
