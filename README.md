# got-resume.js

# Fetch via HTTP/HTTPS using got with automatic resume after network failures

## Current status

[![NPM version](https://img.shields.io/npm/v/got-resume.svg)](https://www.npmjs.com/package/got-resume)
[![Build Status](https://img.shields.io/travis/overlookmotel/got-resume/master.svg)](http://travis-ci.org/overlookmotel/got-resume)
[![Dependency Status](https://img.shields.io/david/overlookmotel/got-resume.svg)](https://david-dm.org/overlookmotel/got-resume)
[![Dev dependency Status](https://img.shields.io/david/dev/overlookmotel/got-resume.svg)](https://david-dm.org/overlookmotel/got-resume)
[![Coverage Status](https://img.shields.io/coveralls/overlookmotel/got-resume/master.svg)](https://coveralls.io/r/overlookmotel/got-resume)

## Usage

Use [got](https://www.npmjs.com/package/got) to make an HTTP request with automatic retries for network errors.

Designed for downloading large files. If transfer fails part-way through, will retry, resuming from point where previous attempt finished, using HTTP range headers.

### gotResume( [url], [options] ) -> Stream

```js
const stream = gotResume('http://google.com/');
const writeStream = fs.createWriteStream('foo.html');
stream.pipe(writeStream);
```

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

If server does not provide `content-length` header, and `options.length` is not set, transfer will be considered complete when first successful request complete.

If `options.length` is set, only that number of bytes will be fetched.

#### offset

Number of bytes at start of resource to skip. Default `0`.

NB Number of bytes to be streamed is `length - offset`. i.e. `length` is actually not length of response, but end of range.

e.g. `{offset: 5, length: 10}` will stream 5 bytes.

#### pre

An async function that is run before each chunk request. Must return a `Promise`. Request will commence once promise resolves.

Useful where some authentication requires being set up before transfer HTTP request, or where resource has a different URL each time (e.g. Amazon EC2).

`pre` function is called with `Transfer` object (see below). To set URL for next chunk, `pre` should set `transfer.url`. To alter `got` options, should set `transfer.gotOptions`.

```js
function pre(transfer) {
	transfer.gotOptions.headers['user-agent'] = 'Stealth 2.0';
	return Promise.resolve();
}
```

#### log

Function to receive logging information e.g. HTTP responses

```js
const stream = gotResume( 'http://google.com/', {log: console.log} );
```

#### got

Options to pass to `got`. See [got documentation](https://www.npmjs.com/package/got) for details.

```js
const stream = gotResume( 'http://google.com/', {got: {method: 'POST'} } );
```

### Events

#### error

Emitted with a `gotResume.TransferError` on stream when transfer fails and has exhausted retries.

#### end

Emitted when transfer completes.

NB Is also emitted after `error` event if transfer fails.

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

### Transfer object

A transfer in progress is represented internally as an instance of `gotResume.Transfer` class.

Transfer object is stored as `stream.transfer` and also passed to `options.pre` function.

## Tests

Use `npm test` to run the tests. Use `npm run cover` to check coverage.

No tests yet but seems to work fine!

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
