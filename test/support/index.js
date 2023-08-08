/* --------------------
 * got-resume module
 * Tests set-up
 * ------------------*/

'use strict';

/*
 * Throw any unhandled promise rejections
 */
process.on('unhandledRejection', (err) => {
	throw err;
});

// Constants
const URL_PREFIX = 'https://raw.githubusercontent.com/overlookmotel/got-resume/master/test/files/';

// Exports

module.exports = {streamToString, URL_PREFIX};

function streamToString(stream) {
	return new Promise((resolve, reject) => {
		let txt = '';
		stream.on('data', (data) => {
			txt += data.toString();
		});
		stream.once('end', () => {
			resolve(txt);
		});
		stream.once('error', reject);
	});
}
