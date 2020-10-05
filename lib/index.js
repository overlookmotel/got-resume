/* --------------------
 * got-resume module
 * Entry point
 * ------------------*/

'use strict';

// Imports
const gotResume = require('./stream.js'),
	toFile = require('./toFile.js'),
	errors = require('./errors.js'),
	Transfer = require('./transfer.js');

// Exports

module.exports = Object.assign(gotResume, {toFile, Transfer}, errors);
