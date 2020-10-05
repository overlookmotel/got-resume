/* --------------------
 * got-resume module
 * Tests
 * ------------------*/

'use strict';

// Modules
const chai = require('chai'),
	{expect} = chai,
	pathJoin = require('path').join,
	fs = require('fs-extra-promise'),
	gotResume = require('../index.js');

// Constants
const URL_PREFIX = 'https://raw.githubusercontent.com/overlookmotel/got-resume/master/test/files/';
const TEMP_DIR = pathJoin(__dirname, 'temp');

// Init
chai.config.includeStack = true;

// Tests

/* global describe, it, beforeEach, afterEach */

describe('Tests', () => {
	describe('Streams', () => {
		it('empty file', (done) => {
			const stream = gotResume(`${URL_PREFIX}empty.txt`);

			let count = 0,
				err;
			stream.on('data', () => count++);
			stream.on('end', () => {
				if (err) return;
				if (count > 0) {
					done(new Error('No data should have been received'));
				} else {
					done();
				}
			});
			stream.on('error', (_err) => {
				err = _err;
				done(err);
			});
		});

		it('short file', (done) => {
			const stream = gotResume(`${URL_PREFIX}short.txt`);

			let out = '',
				err;
			stream.on('data', (data) => {
				out += data.toString();
			});
			stream.on('end', () => {
				if (err) return;
				if (out !== 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
					done(new Error('Bad data received'));
				} else {
					done();
				}
			});
			stream.on('error', (_err) => {
				err = _err;
				done(err);
			});
		});
	});

	describe('toFile method saves', () => {
		// Create/remove temp dir before/after
		beforeEach(() => fs.mkdirAsync(TEMP_DIR));
		afterEach(() => fs.removeAsync(TEMP_DIR));

		it('empty file', async () => {
			const path = pathJoin(TEMP_DIR, 'empty.txt');
			await gotResume.toFile(path, `${URL_PREFIX}empty.txt`);
			const txt = await fs.readFileAsync(path, 'utf8');
			expect(txt).to.equal('');
		});

		it('short file', async () => {
			const path = pathJoin(TEMP_DIR, 'short.txt');
			await gotResume.toFile(path, `${URL_PREFIX}short.txt`);
			const txt = await fs.readFileAsync(path, 'utf8');
			expect(txt).to.equal('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
		});
	});
});
