/* --------------------
 * got-resume module
 * Tests for streams
 * ------------------*/

'use strict';

// Modules
const gotResume = require('got-resume');

// Imports
const {streamToString, URL_PREFIX} = require('./support/index.js');

// Tests

describe('`gotResume()`', () => {
	describe('streams', () => {
		it('empty file', async () => {
			const txt = await get('empty.txt');
			expect(txt).toBe('');
		});

		it('short file', async () => {
			const txt = await get('short.txt');
			expect(txt).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
		});
	});
});

function get(filename, options) {
	const stream = gotResume(`${URL_PREFIX}${filename}`, options);
	return streamToString(stream);
}
