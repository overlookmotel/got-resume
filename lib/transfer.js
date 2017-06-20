/* --------------------
 * got-resume module
 * Transfer class
 * ------------------*/

'use strict';

// Modules
const streamModule = require('stream'),
	got = require('got');

// Imports
const errors = require('./errors'),
	backoff = require('./backoff');

// Exports

/*
 * Transfer class
 */

/**
 * Transfer constructor
 * @constructor
 * @param {Object} options - Options object
 */
function Transfer(options) {
	// Save options to transfer object
	this.options = options;
	this.url = options.url;
	this.gotOptions = Object.assign({}, options.got);
	this.gotOptions.headers = Object.assign({}, this.gotOptions.headers);
	this.length = options.length;
	this.log = options.log;

	// Init transfer object
	this.attempt = 0;
	this.attemptTotal = 0;
	this.position = this.options.offset;
	this.total = undefined;
	this.cancelled = false;

	// Create output stream
	this.stream = new streamModule.PassThrough();

	// Add `.cancel()` method to stream
	this.stream.cancel = this.cancel.bind(this);

	// Record transfer object on stream
	this.stream.transfer = this;
}

module.exports = Transfer;

/**
 * Start transfer.
 * Runs `options.pre` if provided and calls `transfer.get()`.
 * Called at start of transfer and again repeatedly for each retry.
 * @returns {undefined}
 */
Transfer.prototype.start = function() {
	this.attempt++;
	this.attemptTotal++;
	delete this.err;

	if (this.log) this.log('Starting transfer', {transfer: logObj(this)});

	const {pre} = this.options;

	if (!pre) {
		this.get();
		return;
	}

	this.prePromise = pre(this);

	this.prePromise.then(() => {
		delete this.prePromise;

		if (!this.url) throw new errors.PreError('pre function did not set transfer.url');
		if (this.cancelled) throw new errors.CancelError('Transfer cancelled');

		this.get();
	}).catch(err => {
		delete this.prePromise;

		this.err = err;

		this.failed(err, true);
	});
};

/**
 * Create HTTP request and pipe to stream.
 * Pipes result of request to output stream.
 * When transfer is complete, `end` event emmitted on output stream.
 * If transfer fails, calls `transfer.failed()` to retry or exit.
 * @returns {undefined}
 */
Transfer.prototype.get = function() {
	if (this.log) this.log('Starting fetch', {transfer: logObj(this)});

	// Set range options
	if (this.position) this.gotOptions.headers.range = `bytes=${this.position}-`;

	this.gotOptions.encoding = null;

	// Use `got` module to stream URL
	let aborted = false;
	const stream = got.stream(this.url, this.gotOptions);

	stream.on('error', err => {
		if (this.log) this.log('Stream error', {err});

		// Delete req from transfer object
		delete this.req;

		// Save error object to transfer
		this.err = err;

		// Request timeouts do not end stream - end manually
		// (see https://github.com/sindresorhus/got/issues/337)
		if (err instanceof got.RequestError && err.message == 'Request timed out') stream.emit('end');
	});

	// When request made, record to transfer object
	// (so it can be aborted if required)
	stream.on('request', req => {
		if (this.log) this.log('Sent HTTP request', {headers: req._headers});

		// Emit request event
		if (!this.req) this.stream.emit('request', req);

		// If transfer cancelled, abort request
		if (this.cancelled) req.abort();

		// Record req to transfer object
		this.req = req;
	});

	stream.on('end', () => {
		if (this.log) this.log('Got stream ended');

		// Delete req from transfer object
		delete this.req;
	});

	// When response headers received, record to transfer object,
	// set length and check range headers correct
	stream.on('response', res => {
		if (this.log) this.log('Received HTTP response', {headers: res.headers});

		// Process response
		// Errors with e.g. range headers are emitted as errors
		const first = !this.res;
		try {
			// Check range headers match what requested
			// and set length from headers if not supplied in options.length
			const {headers} = res;

			if (this.position) {
				if (headers['accept-ranges'] != 'bytes') throw new errors.TransferError('Server does not support range requests');

				if (!headers['content-range']) throw new errors.TransferError('No range header');
				const range = headers['content-range'].match(/^bytes (\d+)-\d+\/(\d+)$/);
				if (!range) throw new errors.TransferError(`Malformed range header '${range}'`);
				if (range[1] != this.position + '') throw new errors.TransferError(`Server returned wrong range '${range}'`);

				if (first && this.length == null) this.length = range[2] * 1;
			} else if (first && headers['content-length']) {
				if (this.length == null) this.length = headers['content-length'] * 1;
			}

			// Record/check last modified date and/or eTag to ensure resource has not
			// changed between requests.
			if (first) {
				this.lastMod = headers['last-modified'];
				this.etag = headers.etag;

				// Record total bytes to be transferred
				if (this.length != null) this.total = this.length - this.options.offset;

				// Emit progress event
				this.stream.emit('progress', {transferred: 0, total: this.total});
			} else {
				if (this.lastMod && headers['last-modified'] != this.lastMod) throw new errors.TransferError(`Last modified date has changed: '${headers['last-modified']}' from '${this.lastMod}'`);
				if (this.etag && headers.etag != this.etag) throw new errors.TransferError(`ETag has changed: '${headers.etag}' from '${this.etag}'`);
			}
		} catch (err) {
			aborted = true;
			this.req.abort(err);
			return;
		}

		// Record res to transfer object
		this.res = res;

		// Emit response event
		if (first) this.stream.emit('response', res);
	});

	// Pipe transfer to output via transform stream to limit to range
	// and handle end of transfer
	const transfer = this;
	let received = 0;
	const transformStream = new streamModule.Transform({
		transform(chunk, encoding, callback) { // jshint ignore:line
			// If transfer aborted or error, discard incoming data
			// Solves https://github.com/overlookmotel/got-resume/issues/3
			if (aborted || transfer.err) {
				callback();
				return;
			}

			// Increment count of bytes received
			received += chunk.length;

			// If entire chunk is before range required, discard chunk
			const {length, options: {offset}} = transfer;
			let chunkEnd = transfer.position + chunk.length;
			if (chunkEnd <= offset) {
				transfer.position = chunkEnd;
				callback();
				return;
			}

			// If only part of chunk is within range required, shorten chunk
			if (transfer.position < offset) {
				chunk = chunk.slice(offset - transfer.position);
				transfer.position = offset;
			}

			if (length != null && chunkEnd > length) {
				chunk = chunk.slice(0, length - transfer.position);
				chunkEnd = length;
			}

			// Output chunk + update position
			transfer.position = chunkEnd;
			if (chunk.length) this.push(chunk);

			// Emit progress event
			transfer.stream.emit('progress', {
				transferred: chunkEnd - transfer.options.offset,
				total: transfer.total
			});

			// If transfer complete, end stream and cancel request
			if (length != null && chunkEnd == length) {
				this.push(null);
				if (transfer.req) transfer.req.abort();
			}

			// Done
			callback();
		}
	});

	transformStream.on('end', () => {
		if (this.log) this.log('Transform stream ended');

		// Unpipe stream from output stream
		transformStream.unpipe();

		// Check if transfer complete
		if (this.position == this.length || (this.length == null && this.res && !this.err)) { // jshint ignore:line
			// Transfer complete - end output stream
			transfer.stream.end();
			if (this.log) this.log('Finished', {transfer: logObj(this)});
		} else {
			// Transfer incomplete - try again
			transfer.failed(new errors.TransferError(`Transfer stopped before end - at ${transfer.position} not ${transfer.length}`), !received);
		}
	});

	stream.pipe(transformStream).pipe(this.stream, {end: false});
};

/**
 * Called when transfer fails (or `options.urFn` rejects).
 * Retries depending on how many failures, and `attempt` options.
 * Calls `transfer.start()` again to retry, or `transfer.fatal()` if retries exhausted.
 * @returns {undefined}
 */
Transfer.prototype.failed = function(err, empty) {
	if (this.log) this.log('Transfer failed', {err});

	// If transfer cancelled, emit error on stream and stop
	if (this.cancelled) {
		this.fatal();
		return;
	}

	// If retries limit hit, emit error on stream and stop
	if ((this.options.attempts && this.attempt >= this.options.attempts) || (this.options.attemptsTotal && this.attemptTotal >= this.options.attemptsTotal)) { // jshint ignore:line
		this.fatal();
		return;
	}

	// Get time to pause before next retry
	const pause = (this.options.backoff || backoff)(this.attempt, this);
	if (pause === false) {
		this.fatal();
		return;
	}

	// If response from last attempt was not empty, reset attempt timer
	if (!empty) this.attempt = 0;

	// Schedule retry
	if (this.log) this.log(`Scheduling retry in ${pause} ms`);

	this.waitTimer = setTimeout(() => {
		delete this.waitTimer;
		this.start();
	}, pause);
};

/**
 * Called when transfer fails fatally.
 * Emits `error` event on output stream.
 * @returns {undefined}
 */
Transfer.prototype.fatal = function() {
	if (this.log) this.log('Transfer failed permanently', {transfer: logObj(this)});

	const err = this.cancelled ? new errors.CancelError('Transfer cancelled') : new errors.TransferError(`Failed - Retries exhausted (${this.attempt}, ${this.attemptTotal} total)`);
	this.stream.emit('error', err);
	this.stream.emit('end');
};

/**
 * Abort transfer.
 * @returns {undefined}
 */
Transfer.prototype.cancel = function() {
	// If already cancelled, ignore
	if (this.cancelled) return;

	// Set cancelled flag
	this.cancelled = true;

	if (this.log) this.log('Transfer cancelled', {transfer: logObj(this)});

	// Cancel current action
	if (this.prePromise) {
		// pre function running - try to cancel it
		if (typeof this.prePromise.cancel == 'function') this.prePromise.cancel();
	} else if (this.req) {
		// Request in progress - abort it
		this.req.abort();
	} else if (this.waitTimer) {
		// Waiting to make new request - cancel timer and fail
		clearTimeout(this.waitTimer);
		this.failed(new errors.CancelError('Transfer cancelled'), true);
	}
};

/*
 * Utility functions
 */

/**
 * Create short copy of transfer object with `.req`, `.res`, `.err` and `.stream` removed for logging
 * @param {Transfer} transfer - Transfer object
 * @returns {Object} - Short copy of transfer object
 */
function logObj(transfer) {
	const out = Object.assign({}, transfer);
	delete out.req;
	delete out.res;
	delete out.err;
	delete out.stream;
	return out;
}
