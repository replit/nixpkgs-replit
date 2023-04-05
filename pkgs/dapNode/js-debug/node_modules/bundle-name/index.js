'use strict';
const runApplescript = require('run-applescript');

module.exports = bundleId => runApplescript(`tell application "Finder" to set app_path to application file id "${bundleId}" as string\ntell application "System Events" to get value of property list item "CFBundleName" of property list file (app_path & ":Contents:Info.plist")`);
