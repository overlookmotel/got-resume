/* --------------------
 * got-resume module
 * Tests
 * ------------------*/

'use strict';

// Modules
const chai = require('chai'),
	//expect = chai.expect,
	gotResume = require('../lib/');

// Constants
const URL_PREFIX = 'https://raw.githubusercontent.com/overlookmotel/got-resume/master/test/files/';

// Init
chai.config.includeStack = true;

// Tests

/* jshint expr: true */
/* global describe, it */

describe('Tests', () => {
	describe('Transfers', () => {
		it('Empty file', done => {
			const stream = gotResume(URL_PREFIX + 'empty.txt');

			let count = 0, err;
			stream.on('data', () => count++);
			stream.on('end', () => {
				if (err) return;
				if (count) return done(new Error('No data should have been received'));
				done();
			});
			stream.on('error', _err => {
				err = _err;
				done(err);
			});
		});

		it('Short file', done => {
			const stream = gotResume(URL_PREFIX + 'short.txt');

			let out = '', err;
			stream.on('data', (data) => {
				out += data.toString();
			});
			stream.on('end', () => {
				if (err) return;
				if (out != 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') return done(new Error('Bad data received'));
				done();
			});
			stream.on('error', _err => {
				err = _err;
				done(err);
			});
		});
	});
});
