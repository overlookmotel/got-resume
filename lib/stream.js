/* --------------------
 * got-resume module
 * Main method
 * ------------------*/

'use strict';

// Modules
const pump = require('pump');

// Imports
const errors = require('./errors'),
	Transfer = require('./transfer');

// Exports
/**
 * Fetch URL with retries if failure.
 * Returns stream of transfer contents.
 *
 * @param {string} [url] - URL (optional)
 * @param {Object} [options] - Options object
 * @param {number} [options.url] - URL (alternative way to provide)
 * @param {number} [options.attempts=10] - Number of attempts to make before failing (0 for no limit)
 * @param {number} [options.attemptsTotal=0] - Total number of attempts to make before failing (0 for no limit)
 * @param {Object} [options.got] - Options to pass to `got` module
 * @param {number} [options.length] - Length of transfer (NB is actually range end - does not take into account options.offset)
 * @param {number} [options.offset=0] - Number of bytes at start of file to skip
 * @param {boolean} [options.needLength=false] - `true` to disable gzip encoding on first request in order to get length
 * @param {Function} [options.backoff] - Function called with `backoff(attempt, transfer)` and should return milliseconds to wait before next attempt
 * @param {Function} [options.pre] - Function to call before HTTP requests. Is passed `transfer` object, should set `transfer.url` and `transfer.gotOptions` and return a promise.
 * @param {Stream} [options.transform] - Transform stream to pass result through
 * @param {Function} [options.log] - Function to call with logging information
 * @returns {Stream}
 */
module.exports = function(url, options) {
	// Conform arguments
	if (url && typeof url == 'object') {
		options = url;
		url = undefined;
	} else if (url == null) {
		if (!options) throw new errors.OptionsError('url or options must be provided');
		if (typeof options != 'object') throw new errors.OptionsError('options must be an object');
	} else if (typeof url != 'string') {
		throw new errors.OptionsError('url must be a string');
	} else if (!options) {
		options = {};
	} else if (typeof options != 'object') {
		throw new errors.OptionsError('options must be an object');
	}

	// Set default options
	options = Object.assign({
		url: undefined,
		attempts: 10,
		attemptsTotal: 0,
		got: undefined,
		length: undefined,
		offset: 0,
		needLength: false,
		backoff: undefined,
		pre: undefined,
		transform: undefined,
		log: undefined
	}, options);

	if (url) options.url = url;

	if (!options.url && !options.pre) throw new errors.OptionsError('url or pre function must be provided');

	// Set default got options
	if (options.got && typeof options.got != 'object') throw new errors.OptionsError('options.got must be an object');
	options.got = Object.assign({retries: 0}, options.got);

	const {got} = options;
	if (got.headers && typeof got.headers != 'object') throw new errors.OptionsError('options.got.headers must be an object');
	got.headers = Object.assign({}, got.headers);

	if (typeof got.timeout == 'number') {
		got.timeout = {request: got.timeout};
	} else if (got.timeout && typeof got.timeout != 'object') {
		throw new errors.OptionsError('options.got.timeout must be an object or a number');
	}
	got.timeout = Object.assign({connect: 5000, socket: 5000, request: 5000}, got.timeout);

	// Start transfer
	const transfer = new Transfer(options);
	transfer.start();

	// If transform stream provided, pipe output stream into it
	let {stream} = transfer;
	const {transform} = options;
	if (transform) {
		// Add cancel method to transform stream
		transform.cancel = stream.cancel;

		// Forward events to transform stream
		for (let event of ['progress', 'request', 'response']) {
			stream.on(event, data => transform.emit(event, data)); // jshint ignore:line
		}

		stream.on('error', err => {
			transform.emit('error', err);
			transform.emit('end');
		});

		// Pipe stream to transform stream
		stream = pump(stream, transform);
	}

	// Return stream
	return stream;
};
