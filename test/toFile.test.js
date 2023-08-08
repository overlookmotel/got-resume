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
