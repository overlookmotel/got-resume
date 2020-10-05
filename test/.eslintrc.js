/* --------------------
 * got-resume module
 * Tests ESLint config
 * ------------------*/

'use strict';

// Exports

module.exports = {
	extends: [
		'@overlookmotel/eslint-config-jest'
	],
	rules: {
		'import/no-unresolved': ['error', {ignore: ['^got-resume(/|$)']}],
		'node/no-missing-require': ['error', {allowModules: ['got-resume']}],
		'node/no-missing-import': ['error', {allowModules: ['got-resume']}]
	}
};
