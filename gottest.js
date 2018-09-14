'use strict';

// Modules
const got = require('got');

let count = 0;
run();

function run() {
	count++;
	console.log(new Date(), `Starting attempt ${count}`);

	let bytes = 0, timer, req, reqError = false;

	const stream = got.stream('http://releases.ubuntu.com/16.04.2/ubuntu-16.04.2-desktop-amd64.iso', {
		retries: 0,
		timeout: {connect: 1000, socket: 1000, request: 1000}
	});

	stream.on('error', err => {
		console.log(new Date(), 'Error', err);
		if (timer) clearTimeout(timer);

		if (err.message == 'Request timed out') {
			reqError = true;
			stream.emit('end');
		}
	});

	stream.on('end', () => {
		console.log(new Date(), 'Ended');
		if (!reqError) setTimeout(run, 5000);
	});

	stream.on('request', _req => {
		console.log(new Date(), 'Sent HTTP request');
		req = _req;
	});

	stream.on('response', res => console.log(new Date(), 'headers', res.headers));

	stream.on('data', chunk => {
		bytes += chunk.length;
		console.log(new Date(), `Received ${chunk.length} bytes, ${bytes} (${bytes / 1024}K) total`);
	});

	//const writeStream = fs.createWriteStream('/Users/jim/Downloads/ubuntu.iso');
	//stream.pipe(writeStream);

	timer = setTimeout(() => {
		console.log(new Date(), 'Aborting');
		req.abort();
	}, 2000);
}
