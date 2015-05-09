/* caption: XLIFF; extensions: .xliff, .xlf */

define(function(require, exports, module) {
"use strict";

var oop = require("ace/lib/oop");
var XmlMode = require("ace/mode/xml").Mode;

var Mode = function() {
    XmlMode.call(this);
};
oop.inherits(Mode, XmlMode);

exports.Mode = Mode;

});
