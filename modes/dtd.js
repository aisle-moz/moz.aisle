/* caption: DTD; extensions: .dtd */

define(function(require, exports, module) {
"use strict";

var oop = require("ace/lib/oop");
var DtdHighlightRules = require("./dtd_highlight_rules").DtdHighlightRules;
var TextMode = require("ace/mode/text").Mode;
var Tokenizer = require("ace/tokenizer").Tokenizer;

var Mode = function() {
    this.$tokenizer = new Tokenizer(new DtdHighlightRules().getRules(), "i");
};
oop.inherits(Mode, TextMode);

exports.Mode = Mode;

});
