/* --------------------
 * got-resume module
 * Tests for streams
 * ------------------*/

'use strict';

// Modules
const gotResume = require('got-resume');

// Constants
const URL_PREFIX = 'https://raw.githubusercontent.com/overlookmotel/got-resume/master/test/files/';

// Init
require('./support/index.js');

// Tests

describe('`gotResume()`', () => {
	describe('streams', () => {
		it('empty file', async () => {
			const stream = gotResume(`${URL_PREFIX}empty.txt`);

			await new Promise((resolve, reject) => {
				let count = 0;
				stream.on('data', () => count++);
				stream.on('end', () => {
					try {
						expect(count).toBe(0);
						resolve();
					} catch (e) {
						reject(e);
					}
				});
				stream.on('error', reject);
			});
		});

		it('short file', async () => {
			const stream = gotResume(`${URL_PREFIX}short.txt`);

			await new Promise((resolve, reject) => {
				let out = '';
				stream.on('data', (data) => {
					out += data.toString();
				});
				stream.on('end', () => {
					try {
						expect(out).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
						resolve();
					} catch (e) {
						reject(e);
					}
				});
				stream.on('error', reject);
			});
		});
	});
});
