define(function(require, exports, module) {
"use strict";

var oop = require("ace/lib/oop");
var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;
var XmlHighlightRules = require("ace/mode/text_highlight_rules").XmlHighlightRules;

var NameStartChar = ':A-Z_a-z\xC0-\xD6\xD8-\xF6\xF8-\u02FF' +
    '\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF'+
    '\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD';
var NameChar = NameStartChar + '\\-\\.0-9' + '\xB7\u0300-\u036F\u203F-\u2040';

var DtdHighlightRules = function() {
    var identifierRe = "[a-zA-Z\u00a1-\uffff]+\\b";

    this.$rules = {
        "start": [{
            token : "text",
            regex : "<\\!\\[CDATA\\[",
            next : "cdata"
        }, {
            token : "comment",
            merge : true,
            regex : "<\\!--",
            next : "comment"
        }, {
            token : "markup",
            regex : "<!ENTITY\\s+",
            next : "entity_key_start"
        }, {
            token: "text",
            regex: "."
        }],
        entity_key_start: [{
            token: "variable",
            regex: '[' + NameStartChar + ']',
            next: "entity_key"
        }],
        entity_key: [{
            token: "variable",
            regex: '[' + NameChar + ']*',
            next: "entity_pre_value"
        }],
        entity_pre_value: [{
            token: "text",
            regex: "\\s+"
        }, {
            token: "markup",
            regex: /\"/,
            next: "start"
        }, {
            token: "markup",
            regex: /\'/,
            next: "start"
        }],
        cdata : [{
            token : "text",
            regex : "\\]\\]>",
            next : "start"
        }, {
            token : "text",
            regex : "\\s+"
        }, {
            token : "text",
            regex : "(?:[^\\]]|\\](?!\\]>))+"
        }],

        comment : [{
            token : "comment",
            regex : ".*?-->",
            next : "start"
        }, {
            token : "comment",
            merge : true,
            regex : ".+"
        }]
    };

    function quoteRule(ch) {
        var prefix = /\w/.test(ch) ? "\\b" : "(?:\\B|^)";
        return prefix + ch + "[^" + ch + "].*?" + ch + "(?![\\w*])";
    }

    var tokenMap = {};

    for (var state in this.$rules) {
        var stateRules = this.$rules[state];
        for (var i = stateRules.length; i--; ) {
            var rule = stateRules[i];
            if (rule.include || typeof rule == "string") {
                var args = [i, 1].concat(this.$rules[rule.include || rule]);
                if (rule.noEscape) {
                    args = args.filter(function(x) {
                        return !x.next;
                    });
                }
                stateRules.splice.apply(stateRules, args);
            } else if (rule.token in tokenMap) {
                rule.token = tokenMap[rule.token];
            }
        }
    }
};
oop.inherits(DtdHighlightRules, TextHighlightRules);

exports.DtdHighlightRules = DtdHighlightRules;
});
