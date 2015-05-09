/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(function(require, exports, module) {
"use strict";

var oop = require("ace/lib/oop");
var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;

var LangHighlightRules = function() {

    // regexp must not have capturing parentheses. Use (?:) instead.
    // regexps are ordered -> the first match is used
    this.$rules = {
        "start" : [
            {
                token : "meta.keyword", // meta
                regex : '##.*?##'
            },
            {
                token : "meta.comment", // meta
                regex : '##.*?$'
            },
            {
                token : "comment", // meta
                regex : '#.*?$'
            },
            {
                token : "constant.language", // meta
                regex : ';.*?$'
            },
        ]
    };
    
};

oop.inherits(LangHighlightRules, TextHighlightRules);

exports.LangHighlightRules = LangHighlightRules;
});
