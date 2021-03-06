/* caption: Gettext; extensions: .po, .pot */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

define(function(require, exports, module) {
"use strict";

var oop = require("ace/lib/oop");
var TextMode = require("ace/mode/text").Mode;
var GettextHighlightRules = require("./gettext_highlight_rules").GettextHighlightRules;

var Mode = function() {
    this.HighlightRules = GettextHighlightRules;
};
oop.inherits(Mode, TextMode);

(function() {

    this.lineCommentStart = '#';

}).call(Mode.prototype);

exports.Mode = Mode;
});
