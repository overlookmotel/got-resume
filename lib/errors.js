/* --------------------
 * got-resume module
 * Errors
 * ------------------*/

'use strict';

// Exports
class BaseError extends Error {
	constructor(message) {
		super(message);
		this.name = 'GotResumeError';
	}
}

class OptionsError extends BaseError {
	constructor(message) {
		super(message);
		this.name = 'GotResumeOptionsError';
	}
}

class TransferError extends BaseError {
	constructor(message) {
		super(message);
		this.name = 'GotResumeTransferError';
	}
}

class CancelError extends BaseError {
	constructor(message) {
		super(message);
		this.name = 'GotResumeCancelError';
	}
}

module.exports = {
	Error: BaseError,
	OptionsError,
	TransferError,
	CancelError
};
