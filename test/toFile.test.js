/* --------------------
 * got-resume module
 * Tests for `.toFile()`
 * ------------------*/

'use strict';

// Modules
const pathJoin = require('path').join,
	{readFile, mkdir, remove} = require('fs-extra'),
	gotResume = require('got-resume');

// Imports
const {URL_PREFIX} = require('./support/index.js');

// Constants
const TEMP_DIR = pathJoin(__dirname, 'temp');

// Tests

describe('`.toFile()`', () => {
	describe('saves', () => {
		it('empty file', async () => {
			const txt = await toFile('empty.txt');
			expect(txt).toBe('');
		});

		it('short file', async () => {
			const txt = await toFile('short.txt');
			expect(txt).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
		});

		it('with offset', async () => {
			const txt = await toFile('short.txt', {offset: 10});
			expect(txt).toBe('KLMNOPQRSTUVWXYZ');
		});

		describe('with length', () => {
			it('total size of file', async () => {
				const txt = await toFile('short.txt', {length: 26});
				expect(txt).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
			});

			it('less than size of file', async () => {
				const txt = await toFile('short.txt', {length: 10});
				expect(txt).toBe('ABCDEFGHIJ');
			});
		});

		describe('with length and offset', () => {
			it('offset 0, length total size of file', async () => {
				const txt = await toFile('short.txt', {offset: 0, length: 26});
				expect(txt).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
			});

			it('offset 10, length total size of file', async () => {
				const txt = await toFile('short.txt', {offset: 10, length: 26});
				expect(txt).toBe('KLMNOPQRSTUVWXYZ');
			});

			it('offset 10, length 20', async () => {
				const txt = await toFile('short.txt', {offset: 10, length: 20});
				expect(txt).toBe('KLMNOPQRST');
			});
		});
	});
});

async function toFile(filename, options) {
	await mkdir(TEMP_DIR);
	const path = pathJoin(TEMP_DIR, filename);
	await gotResume.toFile(path, `${URL_PREFIX}${filename}`, options);
	const txt = await readFile(path, 'utf8');
	await remove(TEMP_DIR);
	return txt;
}
