module.exports = function(options) {
    var plugins = require('./client-default')(options);
    console.log('aisle client set up');
    // add our plugins here
    return plugins;
};

if (!module.parent) require("../server")([__filename].concat(process.argv.slice(2)));
