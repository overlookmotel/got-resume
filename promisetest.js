'use strict';

// Modules
const Promise = require('bluebird'); // jshint ignore:line

// Imports
const gotResume = require('./lib/');

// Run
Promise.each([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], (n) => {
	n = (n < 10 ? '0' : '') + n;
	console.log(`ATTEMPT ${n}`);

	return gotResume.toFile(`/Users/jim/Downloads/download test/ubuntu${n}.iso`, 'http://releases.ubuntu.com/16.04.2/ubuntu-16.04.2-desktop-amd64.iso', {
		//length: 100 * 1024 * 1024,
		//offset: 0,
		//attempts: 10,
		log: (str, obj) => console.log(new Date(), str, obj),
		onProgress: progress => console.log(new Date(), 'Progress:', progress)
	})
	.then(() => console.log('DONE'))
	.catch(err => {
		console.log('ERROR', err);
		throw err;
	});
});

// Cancel after 3 secs
//setTimeout(() => promise.cancel(), 3 * 1000);

//setTimeout(() => console.log('TIMEOUT'), 20 * 1000);
