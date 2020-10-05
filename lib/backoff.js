/* --------------------
 * got-resume module
 * Default backoff function
 * ------------------*/

'use strict';

// Exports

/**
 * Default backoff function
 * 1 sec on first attempt, increasing exponentially, doubling each time.
 * On 10th attempt is 512 secs = 8.5 mins.
 * @param {number} attempt - Attempt number (starting at 1)
 * @returns {number} - Wait (in milliseconds)
 */
module.exports = function(attempt) {
	return (2 ** (attempt - 1)) * 1000;
};
