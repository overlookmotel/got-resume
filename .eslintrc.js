/* --------------------
 * got-resume module
 * ESLint config
 * ------------------*/

'use strict';

// Exports

module.exports = {
	extends: [
		'@overlookmotel/eslint-config',
		'@overlookmotel/eslint-config-node'
	],
	settings: {
		jsdoc: {
			preferredTypes: {Stream: 'Stream'}
		}
	}
};
