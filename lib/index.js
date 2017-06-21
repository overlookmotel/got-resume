/* --------------------
 * got-resume module
 * ------------------*/

'use strict';

// Imports
const gotResume = require('./stream'),
	toFile = require('./toFile'),
	errors = require('./errors'),
	Transfer = require('./transfer');

// Exports
module.exports = Object.assign(gotResume, {toFile, Transfer}, errors);
