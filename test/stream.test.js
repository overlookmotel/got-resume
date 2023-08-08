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

		it('with offset', async () => {
			const txt = await get('short.txt', {offset: 10});
			expect(txt).toBe('KLMNOPQRSTUVWXYZ');
		});

		describe('with length', () => {
			it('total size of file', async () => {
				const txt = await get('short.txt', {length: 26});
				expect(txt).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
			});

			it('less than size of file', async () => {
				const txt = await get('short.txt', {length: 10});
				expect(txt).toBe('ABCDEFGHIJ');
			});
		});

		describe('with length and offset', () => {
			it('offset 0, length total size of file', async () => {
				const txt = await get('short.txt', {offset: 0, length: 26});
				expect(txt).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
			});

			it('offset 10, length total size of file', async () => {
				const txt = await get('short.txt', {offset: 10, length: 26});
				expect(txt).toBe('KLMNOPQRSTUVWXYZ');
			});

			it('offset 10, length 20', async () => {
				const txt = await get('short.txt', {offset: 10, length: 20});
				expect(txt).toBe('KLMNOPQRST');
			});
		});
	});
});

function get(filename, options) {
	const stream = gotResume(`${URL_PREFIX}${filename}`, options);
	return streamToString(stream);
}
