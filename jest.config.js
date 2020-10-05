/* --------------------
 * got-resume module
 * Jest config
 * ------------------*/

'use strict';

// Exports

module.exports = {
	testEnvironment: 'node',
	coverageDirectory: 'coverage',
	collectCoverageFrom: ['index.js', 'lib/**/*.js'],
	moduleNameMapper: {
		'^got-resume($|/.*)': '<rootDir>$1'
	}
};
