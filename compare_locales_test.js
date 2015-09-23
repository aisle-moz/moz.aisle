/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
 
"use client";
"use mocha";

define(function(require, exports, module) {
    main.consumes = ["plugin.test", "moz_compare_locales"];
    main.provides = [];
    return main;

    function main(options, imports, register) {
        var test = imports["plugin.test"];
        var myplugin = imports["moz_compare_locales"];
        
        var describe = test.describe;
        var it = test.it;
        var before = test.before;
        var after = test.after;
        var beforeEach = test.beforeEach;
        var afterEach = test.afterEach;
        var assert = test.assert;
        var expect = test.expect;
        
        /***** Initialization *****/
        
        describe("The ace modes", function(){
            this.timeout(2000);
            
            beforeEach(function() {
            });
        
            afterEach(function () {
            });
            
            it("are not tested", function() {
            });
        });
        
        register(null, {});
    }
});