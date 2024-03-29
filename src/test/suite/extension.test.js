"use strict";
exports.__esModule = true;
var assert = require("assert");
var mocha_1 = require("mocha");
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
var vscode = require("vscode");
// import * as myExtension from '../extension';
suite('Extension Test Suite', function () {
    mocha_1.before(function () {
        vscode.window.showInformationMessage('Start all tests.');
    });
    test('Sample test', function () {
        assert.equal(-1, [1, 2, 3].indexOf(5));
        assert.equal(-1, [1, 2, 3].indexOf(0));
    });
});
