/* --------------------
 * got-resume module
 * Tests for idle timeout
 * ------------------*/

'use strict';

// Modules
const {Server} = require('http'),
	gotResume = require('got-resume');

// Imports
const {streamToString} = require('./support/index.js');

// Constants
const PORT = 5000,
	URL = `http://localhost:${PORT}/foo.txt`;

// Init
jest.setTimeout(10000);

// Tests

describe('Idle timeout', () => {
	let server, handle;
	beforeEach(async () => {
		server = new Server();
		server.on('request', (req, res) => handle(req, res));
		await new Promise((resolve, reject) => {
			server.once('error', reject);
			server.listen(PORT, () => {
				server.off('error', reject);
				resolve();
			});
		});
	});
	afterEach(() => new Promise((resolve, reject) => {
		server.close(err => (err ? reject(err) : resolve()));
	}));

	it('continues after idle timeout', async () => {
		const resTxt = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
			resLen = resTxt.length,
			chunkSize = 10;

		handle = (req, res) => {
			// Serve file in short chunks but stall transmitting each time part-way through
			const {range} = req.headers;
			if (!range) {
				res.setHeader('content-length', resLen);
				res.write(resTxt.slice(0, chunkSize));
			} else {
				const rangeStart = range.match(/^bytes=(\d+)-(\d+)$/)[1] * 1;
				res.setHeader('accept-ranges', 'bytes');
				res.setHeader('content-length', resLen - rangeStart);
				res.setHeader('content-range', `bytes ${rangeStart}-${resLen - 1}/${resLen}`);

				if (resLen - rangeStart > chunkSize) {
					res.write(resTxt.slice(rangeStart, rangeStart + chunkSize));
				} else {
					res.end(resTxt.slice(rangeStart));
				}
			}
		};

		const stream = gotResume(URL, {timeout: {idle: 100}});
		const txt = await streamToString(stream);
		expect(txt).toBe(resTxt);
	});
});
