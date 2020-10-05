# got-resume.js

# Fetch via HTTP/HTTPS using got with automatic resume after network failures

## Current status

[![NPM version](https://img.shields.io/npm/v/got-resume.svg)](https://www.npmjs.com/package/got-resume)
[![Build Status](https://img.shields.io/travis/overlookmotel/got-resume/master.svg)](https://travis-ci.org/overlookmotel/got-resume)
[![Dependency Status](https://img.shields.io/david/overlookmotel/got-resume.svg)](https://david-dm.org/overlookmotel/got-resume)
[![Dev dependency Status](https://img.shields.io/david/dev/overlookmotel/got-resume.svg)](https://david-dm.org/overlookmotel/got-resume)
[![Coverage Status](https://img.shields.io/coveralls/overlookmotel/got-resume/master.svg)](https://coveralls.io/r/overlookmotel/got-resume)

## Usage

Use [got](https://www.npmjs.com/package/got) to make an HTTP request with automatic retries for network errors.

Designed for downloading large files. If transfer fails part-way through, will retry, resuming from point where previous attempt finished, using HTTP range headers.

### gotResume( [url], [options] ) -> Stream

```js
const stream = gotResume('http://google.com/');
stream.pipe( fs.createWriteStream('foo.html') );

stream.on('error', err => console.log('Failed!'));
stream.on('end', () => console.log('Finished!'));
```

### gotResume.toFile( path, [url], [options] ) -> Promise

```js
gotResume.toFile('google.html', 'http://google.com/')
  .then(() => console.log('Finished!'))
  .catch(err => console.log('Failed!'));
```

Promise only resolves (or rejects in case of an error) once transfer is ended and output file is closed.

Promise is a Bluebird v2 promise. Bluebird v2 is used due to its cancellation feature.

### Options

#### url

Alternative way to provide URL.

```js
const stream = gotResume( {url: 'http://google.com/'} );
```

#### attempts

Max number of attempts in a row yielding no data (i.e. failed connection, empty response) before aborting.

Set to `0` for no limit. Default `10`.

```js
const stream = gotResume( 'http://google.com/', {attempts: 0} );
```

#### attemptsTotal

Max number of total attempts before aborting.

Set to `0` for no limit. Default `0`.

#### backoff

Function to determine wait in milliseconds before retry. Called with arguments `(attempt, transfer)`.

`attempt` is what attempt number for current chunk (reset to zero when a new chunk is successfully received).

`transfer` is the internal `Transfer` object (see below).

If function returns `false`, the transfer is aborted. If using this mechanism, `options.attempts` should be set to `0` so it does not interfere.

If not provided, default backoff function starts with 1000ms and doubles each time:

```js
function backoff(attempt) {
  return Math.pow(2, attempt - 1) * 1000;
};
```

#### length

Length of response expected in bytes. If undefined, `length` will be determined from HTTP `content-length` header.

If server does not provide `content-length` header, and `options.length` is not set, transfer will be considered complete when first successful request completes.

If `options.length` is set, only that number of bytes will be fetched (i.e. file will be truncated).

#### offset

Number of bytes at start of resource to skip. Default `0`.

NB Number of bytes to be streamed is `length - offset`. i.e. `length` is actually not length of response, but end of range.

e.g. `{offset: 5, length: 10}` will stream 5 bytes.

#### needLength

Set to true if you require the length of the transfer to be retrieved at start of the transfer. Default: false

Explanation: By default got will use transfer encoding (e.g. gzip). This makes the `content-length` HTTP header unreliable. Setting `options.needLength` disables encoding so length should be retrieved accurately (if server provides it).

#### timeout

Timeout in milliseconds. Default is 5000 (5 seconds).

To disable timeouts, set to `null`.

Timeout is for each chunk, not the whole tranfer. After a timeout, the transfer will retry until max attempts are exhausted.

`timeout` option can also be an object specifying timeouts for different parts of the request/response cycle individually:

```js
timeout: {
  lookup: 1000,
  connect: 1000,
  secureConnect: 1000,
  socket: 1000,
  response: 1000,
  send: 1000,
  request: undefined,
  idle: 10000
}
```

If a number is given as `timeout` option, it will set all the above options to that number, except for `request` which remains undefined.

All above timeout options are passed to [got](https://www.npmjs.com/package/got) (see [here](https://www.npmjs.com/package/got#timeout)), except for `idle`. `idle` is time to wait before aborting chunk if transfer stalls (no data received in specified time).

#### pre

An async function that is run before each chunk request. Must return a `Promise`. Request will commence once promise resolves.

Useful where some authentication requires being set up before the transfer HTTP request, or where resource has a different URL each time (e.g. some file transfer services).

`pre` function is called with `Transfer` object (see below). To set URL for next chunk, `pre` should set `transfer.url`. To alter `got` options, should set `transfer.gotOptions`.

```js
function pre(transfer) {
  transfer.gotOptions.headers['user-agent'] = 'Stealth 2.0';
  return Promise.resolve();
}
```

#### transform

Provide a transform stream through which download stream is passed before being returned.

```js
await gotResume.toFile(
  'google.html.gz',
  'http://google.com/',
  {transform: zlib.createGzip()}
);
```

#### log

Function to receive logging information e.g. HTTP responses.

```js
const stream = gotResume( 'http://google.com/', {log: console.log} );
```

#### got

Options to pass to `got`. See [got documentation](https://www.npmjs.com/package/got) for details.

```js
const stream = gotResume( 'http://google.com/', {got: {method: 'POST'} } );
```

#### Promise

`.toFile()` method only. Promise implementation to use for promises returned.

#### onProgress

`.toFile()` method only. Handler for `progress` event (see above).

#### onResponse

`.toFile()` method only. Handler for `response` event (see above).

### Events

#### error

Emitted with a `gotResume.TransferError` on stream when transfer fails and has exhausted retries.

#### end

Emitted when transfer completes.

NB Is also emitted after `error` event if transfer fails.

#### progress

Emitted when data received. Emitted with progress object of form `{transferred: 100, total: 3000}`.

#### request

Emitted with HTTP request object when first HTTP request made to server.

NB Not emitted again for each retry HTTP request. You cannot abort the transfer with `request.abort()` as the request may be finished if a retry has happened.

#### response

Emitted when first successful HTTP response is received. NB Not emitted again for each retry HTTP request.

Useful for e.g. determining length of transfer:

```js
const stream = gotResume('http://google.com/');
stream.on( 'response', res => console.log('Length: ', stream.transfer.length) );
```

### Cancellation

The stream returned by `gotStream()` has an additional method `.cancel()`. Calling `.cancel()` will abort the transfer and cause the stream to emit an `error` event with a `gotResume.CancelError`.

If the transfer is complete before `.cancel()` is called, no `error` event will be emitted.

If `options.pre` function is supplied and `.cancel()` is called while `options.pre` is running, `.cancel()` method on the promise returned by `options.pre` will be called if it exists. Otherwise the transfer will abort once the promise resolves.

The promise returned by `.toFile()` also has a `.cancel()` method. Calling cancel will cause the promise to be rejected with a Bluebird CancellationError.

### Transfer object

A transfer in progress is represented internally as an instance of `gotResume.Transfer` class.

Transfer object is stored as `stream.transfer` and also passed to `options.pre` function.

## Versioning

This module follows [semver](https://semver.org/). Breaking changes will only be made in major version updates.

All active NodeJS release lines are supported (v10+ at time of writing). After a release line of NodeJS reaches end of life according to [Node's LTS schedule](https://nodejs.org/en/about/releases/), support for that version of Node may be dropped at any time, and this will not be considered a breaking change. Dropping support for a Node version will be made in a minor version update (e.g. 2.3.0 to 2.4.0). If you are using a Node version which is approaching end of life, pin your dependency of this module to patch updates only using tilde (`~`) e.g. `~2.3.4` to avoid breakages.

## Tests

Use `npm test` to run the tests. Use `npm run cover` to check coverage.

Few tests so far but seems to work fine!

## Changelog

See [changelog.md](https://github.com/overlookmotel/got-resume/blob/master/changelog.md)

## Issues

If you discover a bug, please raise an issue on Github. https://github.com/overlookmotel/got-resume/issues

## Contribution

Pull requests are very welcome. Please:

* ensure all tests pass before submitting PR
* add an entry to changelog
* add tests for new features
* document new functionality/API additions in README
