/* --------------------
 * got-resume module
 * toFile method
 * ------------------*/

'use strict';

// Modules
const fs = require('fs'),
	Bluebird = require('bluebird');

// Imports
const gotResume = require('./stream');

// Exports

/**
 * Fetch URL and stream to file.
 * Return Promise. Promise resolves/reject once request is complete
 * (successfully or unsuccessfully) and file is closed.
 *
 * @param {string} path - File path to write to
 * @param {string} [url] - URL (optional)
 * @param {Object} [options] - Options object (as per stream method)
 * @param {Function} [options.onProgress] - Function called with progress
 * @param {Function} [options.onResponse] - Function called with HTTP response
 * @param {Object} [options.Promise] - Promise implementation to use (default: Bluebird v2)
 * @returns {Promise}
 */
module.exports = function(path, url, options) {
	// Conform arguments
	if (url && typeof url === 'object') {
		options = url;
		url = undefined;
	} else if (options == null) {
		options = {};
	}

	// Get promise implementation to use
	const Promise = options.Promise || Bluebird;

	// Run got-resume and stream to file.
	// Create promise that resolves on success or rejects on error.
	let stream, writeStream;
	let promise = new Promise((resolve, reject, onCancel) => {
		// Create stream and pipe to file
		stream = gotResume(url, options);

		writeStream = fs.createWriteStream(path);
		stream.pipe(writeStream);

		let err,
			readEnded = false,
			writeClosed = false;

		stream.on('error', (_err) => {
			if (!err) err = _err;
		});
		stream.on('end', () => { // eslint-disable-line consistent-return
			if (writeClosed) return done();
			readEnded = true;
		});

		writeStream.on('error', (_err) => { // eslint-disable-line consistent-return
			if (!err) err = _err;

			if (readEnded) return done();
			writeClosed = true;

			stream.cancel();
		});
		writeStream.on('close', () => { // eslint-disable-line consistent-return
			if (readEnded) return done();
			writeClosed = true;
		});

		function done() { // eslint-disable-line consistent-return
			if (err) return reject(err);
			resolve();
		}

		// Progress handler
		if (options.onProgress) {
			stream.on('progress', (progress) => {
				if (!err) options.onProgress(progress);
			});
		}

		// Response handler
		if (options.onResponse) {
			stream.on('response', (res) => {
				if (!err) options.onResponse(res);
			});
		}

		// Support Bluebird v3 cancellation
		if (typeof onCancel === 'function') onCancel(() => stream.cancel());
	});

	// Support Bluebird v2 cancellation
	if (typeof promise.cancellable === 'function' && Promise.CancellationError) {
		promise = promise.cancellable();
		promise = promise.catch(Promise.CancellationError, (err) => {
			// Cancel transfer and wait for file to close before rejecting promise
			stream.cancel();

			return new Promise((resolve, reject) => {
				writeStream.on('close', () => reject(err));
				writeStream.on('error', () => reject(err));
			});
		});
	}

	// Return promise
	return promise;
};
