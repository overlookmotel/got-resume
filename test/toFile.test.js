/* --------------------
 * got-resume module
 * Tests for `.toFile()`
 * ------------------*/

'use strict';

// Modules
const pathJoin = require('path').join,
	{readFile, mkdir, remove} = require('fs-extra'),
	gotResume = require('got-resume');

// Constants
const URL_PREFIX = 'https://raw.githubusercontent.com/overlookmotel/got-resume/master/test/files/';
const TEMP_DIR = pathJoin(__dirname, 'temp');

// Init
require('./support/index.js');

// Tests

describe('`.toFile()`', () => {
	describe('saves', () => {
		// Create/remove temp dir before/after
		beforeEach(() => mkdir(TEMP_DIR));
		afterEach(() => remove(TEMP_DIR));

		it('empty file', async () => {
			const path = pathJoin(TEMP_DIR, 'empty.txt');
			await gotResume.toFile(path, `${URL_PREFIX}empty.txt`);
			const txt = await readFile(path, 'utf8');
			expect(txt).toBe('');
		});

		it('short file', async () => {
			const path = pathJoin(TEMP_DIR, 'short.txt');
			await gotResume.toFile(path, `${URL_PREFIX}short.txt`);
			const txt = await readFile(path, 'utf8');
			expect(txt).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
		});
	});
});
