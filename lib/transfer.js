/* --------------------
 * got-resume module
 * Transfer class
 * ------------------*/

'use strict';

// Modules
const streamModule = require('stream'),
	got = require('got');

// Imports
const backoff = require('./backoff.js'),
	{TransferError, PreError, CancelError} = require('./errors.js');

// Exports

/*
 * Transfer class
 */

/**
 * Transfer constructor
 * @class
 * @param {Object} options - Options object
 */
function Transfer(options) {
	// Save options to transfer object
	this.options = options;
	this.url = options.url;
	this.length = options.length;
	this.log = options.log || (() => {});

	this.gotOptions = {...options.got};
	this.gotOptions.headers = {...this.gotOptions.headers};
	if (options.needLength) this.gotOptions.headers['accept-encoding'] = 'identity';

	this.idleTimeout = options.timeout && options.timeout.idle;

	// Init transfer object
	this.attempt = 0;
	this.attemptTotal = 0;
	this.position = this.options.offset;
	this.total = undefined;
	this.cancelled = false;
	this.requestEventFired = false;
	this.req = undefined;
	this.res = undefined;
	this.err = undefined;
	this.lastMod = undefined;
	this.etag = undefined;
	this.prePromise = undefined;
	this.waitTimer = undefined;

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
	this.err = undefined;

	this.log('Starting transfer', {transfer: logObj(this)});

	const {pre} = this.options;

	if (!pre) {
		this.get();
		return;
	}

	this.log('Calling pre function');

	this.prePromise = pre(this);

	this.prePromise.then(() => {
		this.prePromise = undefined;

		if (!this.url) throw new PreError('pre function did not set transfer.url');
		if (this.cancelled) throw new CancelError('Transfer cancelled');

		this.log('Completed pre function', {url: this.url});

		this.get();
	}).catch((err) => {
		this.prePromise = undefined;

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
	this.log('Starting fetch', {transfer: logObj(this)});

	// Set range options.
	// Disable compression as mucks up range request and returned content length.
	if (this.length != null) {
		this.gotOptions.headers.range = `bytes=${this.position}-${this.length - 1}`;
	} else if (this.position > 0) {
		this.gotOptions.headers.range = `bytes=${this.position}-`;
	}
	this.gotOptions.headers['accept-encoding'] = 'identity';

	// Abort function
	let ended = false,
		aborted = false;
	const abort = (err) => {
		aborted = true;
		this.req.abort(err);
	};

	// Idle timer to abort if transfer stalls
	let idleTimer = null;
	const {idleTimeout} = this;
	const setIdleTimeout = () => {
		if (idleTimeout) {
			clearIdleTimeout();
			idleTimer = setTimeout(() => {
				this.log(`Connection idle for ${idleTimeout}ms - aborting`);
				abort();
			}, idleTimeout);
		}
	};
	function clearIdleTimeout() {
		if (idleTimer) {
			clearTimeout(idleTimer);
			idleTimer = null;
		}
	}

	// Use `got` module to stream URL
	const stream = got.stream(this.url, this.gotOptions);
	let res;

	stream.on('error', (err, body) => {
		// Ignore error after end + repeated error events
		if (ended) return;
		ended = true;

		this.log('Stream error', {err, body, timings: res ? res.timings : null});

		clearIdleTimeout();

		// Delete req from transfer object
		this.req = undefined;

		// Save error object to transfer
		this.err = err;

		// Request timeouts do not end stream - end manually
		// (see https://github.com/sindresorhus/got/issues/337)
		// TODO Alter this if issue resolved
		stream.emit('end');
	});

	// When request made, record to transfer object
	// (so it can be aborted if required)
	stream.on('request', (req) => {
		this.log('Sent HTTP request', {headers: req.getHeaders()});

		// Record req to transfer object
		this.req = req;

		// Emit request event
		if (!this.requestEventFired) {
			this.stream.emit('request', req);
			this.requestEventFired = true;
		}

		// If transfer cancelled, abort request
		if (this.cancelled) abort();
	});

	stream.on('end', () => {
		// Ignore repeated end events (some errors emit an end event too)
		if (ended) return;
		ended = true;

		// Delete req from transfer object
		this.req = undefined;

		// If length not provided, determine if transfer is complete from `res.complete`
		if (this.length == null && (!res || !res.complete)) {
			this.log('Got stream ended incomplete');
			this.err = new Error('Response incomplete');
		} else {
			this.log('Got stream ended');
		}

		clearIdleTimeout();
	});

	// When response headers received, record to transfer object,
	// set length and check range headers correct
	stream.on('response', (_res) => {
		res = _res;
		this.log('Received HTTP response', {url: res.url, headers: res.headers});

		// Process response
		// Errors with e.g. range headers are emitted as errors
		const first = !this.res;
		try {
			// Check range headers match what was requested
			// and set length from headers if not supplied in `options.length`
			const {headers} = res;
			if (headers['content-encoding']) {
				throw new TransferError(`Unexpected content-encoding header: ${headers['content-encoding']}`);
			}

			const range = headers['content-range'];
			if (range) {
				// Range header is present - check is as expected
				const rangeMatch = range.match(/^bytes (\d+)-(\d+)\/(\d+)$/);
				if (!rangeMatch) throw new TransferError(`Malformed range header '${range}'`);

				if (rangeMatch[1] !== `${this.position}`) {
					throw new TransferError(
						`Server returned wrong range '${range}', expected start at ${this.position}`
					);
				}

				if (this.length != null) {
					if (rangeMatch[2] !== `${this.length - 1}`) {
						throw new TransferError(
							`Server returned wrong range '${range}', expected end at ${this.length - 1}`
						);
					}
				} else if (first) {
					this.length = rangeMatch[3] * 1;
				}
			} else if (this.position > 0) {
				throw new TransferError('No range header');
			}

			if (first && headers['content-length'] && !headers['content-encoding']) {
				let contentLen = headers['content-length'];
				if (!/^\d+$/.test(contentLen)) {
					throw new TransferError(`Invalid content-length header: ${contentLen}`);
				}
				contentLen *= 1;

				if (this.length != null) {
					if (contentLen !== this.length - this.position) {
						throw new TransferError(
							`Server returned wrong content length '${contentLen}', expected length ${this.length}`
						);
					}
				} else {
					this.length = contentLen + this.position;
				}
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
				if (this.lastMod && !this.options.ignoreLastMod && headers['last-modified'] !== this.lastMod) {
					throw new TransferError(
						`Last modified date has changed: '${headers['last-modified']}' from '${this.lastMod}'`
					);
				}
				if (this.etag && headers.etag !== this.etag) {
					throw new TransferError(`ETag has changed: '${headers.etag}' from '${this.etag}'`);
				}
			}
		} catch (err) {
			this.log('Response error', {err});
			abort(err);
			return;
		}

		// Record res to transfer object
		this.res = res;

		// Start idle timer
		setIdleTimeout();

		// Emit response event
		if (first) this.stream.emit('response', res);
	});

	// Pipe transfer to output via transform stream to limit to range
	// and handle end of transfer
	const transfer = this;
	let received = 0;
	const transformStream = new streamModule.Transform({
		transform(chunk, encoding, callback) {
			// If transfer ended or aborted, discard incoming data.
			// Solves https://github.com/overlookmotel/got-resume/issues/3
			// Also possible more data will arrive after
			if (ended || aborted) {
				callback();
				return;
			}

			// Increment count of bytes received
			received += chunk.length;

			// Reset idle timer
			setIdleTimeout();

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
				transferred: chunkEnd - offset,
				total: transfer.total
			});

			// If transfer complete, end stream and cancel request
			if (length != null && chunkEnd === length) {
				this.push(null);
				if (transfer.req) abort();
			}

			// Done
			callback();
		}
	});

	transformStream.on('end', () => {
		this.log('Transform stream ended');

		// Unpipe stream from output stream
		transformStream.unpipe();

		// Check if transfer complete
		const {length} = this;
		if (this.position === length || (length == null && res && !this.err)) {
			// Transfer complete - end output stream
			this.stream.end();
			this.log('Finished', {transfer: logObj(this)});
		} else {
			// Transfer incomplete - try again
			this.failed(
				new TransferError(
					`Transfer stopped before end - at ${this.position}${length != null ? ` not ${length}` : ''}`
				),
				!received
			);
		}
	});

	stream.pipe(transformStream).pipe(this.stream, {end: false});
};

/**
 * Called when transfer fails (or `options.preFn` rejects).
 * Retries depending on how many failures, and `attempt` options.
 * Calls `transfer.start()` again to retry, or `transfer.fatal()` if retries exhausted.
 * @param {Error} err - Error chunk failed with
 * @param {boolean} empty - `true` if no data transferred in last chunk
 * @returns {undefined}
 */
Transfer.prototype.failed = function(err, empty) {
	this.log('Transfer failed', {err});

	// If transfer cancelled, emit error on stream and stop
	if (this.cancelled) {
		this.fatal();
		return;
	}

	// If response from last attempt was not empty, reset attempt counter
	if (!empty) this.attempt = 0;

	// If retries limit hit, emit error on stream and stop
	if (
		(this.options.attempts && this.attempt >= this.options.attempts)
		|| (this.options.attemptsTotal && this.attemptTotal >= this.options.attemptsTotal)
	) {
		this.fatal();
		return;
	}

	// Get time to pause before next retry
	const pause = (this.options.backoff || backoff)(this.attempt + 1, this);
	if (pause === false) {
		this.fatal();
		return;
	}

	// Schedule retry
	this.log(`Scheduling retry in ${pause} ms`);

	this.waitTimer = setTimeout(() => {
		this.waitTimer = undefined;
		this.start();
	}, pause);
};

/**
 * Called when transfer fails fatally.
 * Emits `error` event on output stream.
 * @returns {undefined}
 */
Transfer.prototype.fatal = function() {
	this.log('Transfer failed permanently', {transfer: logObj(this)});

	const err = this.cancelled
		? new CancelError('Transfer cancelled')
		: new TransferError(`Failed - Retries exhausted (${this.attempt}, ${this.attemptTotal} total)`);
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

	this.log('Transfer cancelled', {transfer: logObj(this)});

	// Cancel current action
	if (this.prePromise) {
		// pre function running - try to cancel it
		if (typeof this.prePromise.cancel === 'function') this.prePromise.cancel();
	} else if (this.req) {
		// Request in progress - abort it
		this.req.abort();
	} else if (this.waitTimer) {
		// Waiting to make new request - cancel timer and fail
		clearTimeout(this.waitTimer);
		this.waitTimer = undefined;
		this.failed(new CancelError('Transfer cancelled'), true);
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
	const out = {...transfer};
	delete out.req;
	delete out.res;
	delete out.err;
	delete out.stream;
	if (out.options && out.options.transform) {
		out.options = {...out.options};
		out.options.transform = '[Stream]';
	}
	return out;
}
