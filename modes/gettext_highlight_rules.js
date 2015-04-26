/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


define(function(require, exports, module) {
"use strict";

var oop = require("ace/lib/oop");
var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;

var GettextHighlightRules = function() {
    // regexp must not have capturing parentheses. Use (?:) instead.
    // regexps are ordered -> the first match is used

    this.$rules = { start: 
       [ { token: 'text',
           regex: '^(?=(?:msgid(?:_plural)?|msgctxt)\\s*"[^"])|^\\s*$',
           push: 
            [ { token: 'text', regex: '\\z', next: 'pop' },
              { include: '#body' } ],
           comment: 'Start of body of document, after header' },
         { include: '#comments' },
         { token: 'comment.line.number-sign.po',
           regex: '^msg(?:id|str)\\s+""\\s*$' },
         { token: 
            [ 'meta.header.po',
              'constant.language.po',
              'punctuation.separator.key-value.po',
              'meta.header.po',
              'string.other.po',
              'meta.header.po' ],
           regex: '^(")(?:([^\\s:]+)(:)(\\s+))?([^"]*)("\\s*$)' } ],
      '#body': 
       [ { token: [ 'keyword.control.msgid.po', 'meta.scope.msgid.po' ],
           regex: '^(msgid(?:_plural)?)(\\s+)',
           push: 
            [ { token: 'meta.scope.msgid.po', regex: '^(?!")', next: 'pop' },
              { token: 'string.quoted.double.po',
                regex: '(?:\\G|^)"',
                push: 
                 [ { token: 'string.quoted.double.po', regex: '"', next: 'pop' },
                   { token: 'constant.character.escape.po', regex: '\\\\[\\\\"]' },
                   { defaultToken: 'string.quoted.double.po' } ] },
              { defaultToken: 'meta.scope.msgid.po' } ] },
         { token: 
            [ 'keyword.control.msgstr.po',
              'keyword.control.msgstr.po',
              'constant.numeric.po',
              'keyword.control.msgstr.po',
              'meta.scope.msgstr.po' ],
           regex: '^(msgstr)(?:(\\[)(\\d+)(\\]))?(\\s+)',
           push: 
            [ { token: 'meta.scope.msgstr.po', regex: '^(?!")', next: 'pop' },
              { token: 'string.quoted.double.po',
                regex: '(?:\\G|^)"',
                push: 
                 [ { token: 'string.quoted.double.po', regex: '"', next: 'pop' },
                   { token: 'constant.character.escape.po', regex: '\\\\[\\\\"]' },
                   { defaultToken: 'string.quoted.double.po' } ] },
              { defaultToken: 'meta.scope.msgstr.po' } ] },
         { token: 
            [ 'keyword.control.msgctxt.po',
              'keyword.control.msgctxt.po',
              'constant.numeric.po',
              'keyword.control.msgctxt.po',
              'meta.scope.msgctxt.po' ],
           regex: '^(msgctxt)(?:(\\[)(\\d+)(\\]))?(\\s+)',
           push: 
            [ { token: 'meta.scope.msgctxt.po', regex: '^(?!")', next: 'pop' },
              { token: 'string.quoted.double.po',
                regex: '(?:\\G|^)"',
                push: 
                 [ { token: 'string.quoted.double.po', regex: '"', next: 'pop' },
                   { token: 'constant.character.escape.po', regex: '\\\\[\\\\"]' },
                   { defaultToken: 'string.quoted.double.po' } ] },
              { defaultToken: 'meta.scope.msgctxt.po' } ] },
         { token: 
            [ 'punctuation.definition.comment.po',
              'comment.line.number-sign.obsolete.po' ],
           regex: '^(#~)(.*$)' },
         { include: '#comments' },
         { token: 'invalid.illegal.po',
           regex: '^(?!\\s*$)[^#"].*$',
           comment: 'a line that does not begin with # or ". Could improve this regexp' } ],
      '#comments': 
       [ { token: 'text',
           regex: '^(?=#)',
           push: 
            [ { token: 'text', regex: '(?!\\G)', next: 'pop' },
              { token: 
                 [ 'punctuation.definition.comment.po',
                   'comment.line.number-sign.flag.po' ],
                regex: '(#,)(\\s+)',
                push: 
                 [ { token: 'comment.line.number-sign.flag.po',
                     regex: '$',
                     next: 'pop' },
                   { token: 'entity.name.type.flag.po',
                     regex: '(?:\\G|,\\s*)(?:fuzzy|(?:no-)?(?:c|objc|sh|lisp|elisp|librep|scheme|smalltalk|java|csharp|awk|object-pascal|ycp|tcl|perl|perl-brace|php|gcc-internal|qt|boost)-format)' },
                   { defaultToken: 'comment.line.number-sign.flag.po' } ] },
              { token: 'punctuation.definition.comment.po',
                regex: '#\\.',
                push: 
                 [ { token: 'comment.line.number-sign.extracted.po',
                     regex: '$',
                     next: 'pop' },
                   { defaultToken: 'comment.line.number-sign.extracted.po' } ] },
              { token: 
                 [ 'punctuation.definition.comment.po',
                   'comment.line.number-sign.reference.po' ],
                regex: '(#:)([ \\t]*)',
                push: 
                 [ { token: 'comment.line.number-sign.reference.po',
                     regex: '$',
                     next: 'pop' },
                   { token: 'storage.type.class.po', regex: '\\S+:[\\d;]*' },
                   { defaultToken: 'comment.line.number-sign.reference.po' } ] },
              { token: 'punctuation.definition.comment.po',
                regex: '#\\|',
                push: 
                 [ { token: 'comment.line.number-sign.previous.po',
                     regex: '$',
                     next: 'pop' },
                   { defaultToken: 'comment.line.number-sign.previous.po' } ] },
              { token: 'punctuation.definition.comment.po',
                regex: '#',
                push: 
                 [ { token: 'comment.line.number-sign.po', regex: '$', next: 'pop' },
                   { defaultToken: 'comment.line.number-sign.po' } ] } ] } ] }
    
    this.normalizeRules();
};

GettextHighlightRules.metaData = { comment: '\nTODO:  Command for copy original to untranslated, label as fuzzy, remove fuzzy, next fuzzy etc\nCreate meta scope for each entry\n',
      fileTypes: [ 'po', 'pot', 'potx' ],
      keyEquivalent: '^~G',
      name: 'Gettext',
      scopeName: 'source.po' }


oop.inherits(GettextHighlightRules, TextHighlightRules);

exports.GettextHighlightRules = GettextHighlightRules;
});