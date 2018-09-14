'use strict';

// Modules
const fs = require('fs');

// Imports
const fetch = require('./lib/');

// Run
const stream = fetch('http://releases.ubuntu.com/16.04.2/ubuntu-16.04.2-desktop-amd64.iso', {
	//length: 100 * 1024 * 1024,
	//offset: 0,
	attempts: 50,
	log: (str, obj) => console.log(new Date(), str, obj)
});

let total = 0;

stream.on('error', err => console.log('ERROR:', err));
stream.on('data', chunk => {
	total += chunk.length;
	console.log(`Received ${chunk.length} bytes, ${total} (${total / 1024}K) total`);
});
stream.on('end', () => console.log(`END ${total} bytes (${total / 1024}K)`));

const writeStream = fs.createWriteStream('/Users/jim/Downloads/ubuntu.iso');
stream.pipe(writeStream);

//setTimeout(() => console.log('Timeout'), 60 * 60 * 1000); // 1 hour

// Cancel after 10 secs
setTimeout(() => stream.cancel(), 10 * 1000);
