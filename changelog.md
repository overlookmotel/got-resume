# Changelog

## 2.2.0

Bug fixes:

* Support servers which don't return range header on first request
* Get correct length when using `offset` option

Minor:

* Drop support for Node v14, v19

Dev:

* Run tests on CI on Node v20
* Update dev dependencies

## 2.1.1

Improvements:

* Request range if `options.length` provided

Dev:

* Run tests on all CPU cores on CI
* Run ESLint in parallel
* Update dev dependencies

## 2.1.0

Features:

* `ignoreLastMod` option

Minor:

* Drop support for Node v10, v12, v15

Dependencies:

* Update `got` dependency

Dev:

* Use NPM v8 for development
* Run tests on CI on Node v16, v18, v19
* Clean up after `cover` NPM script even if fails
* Update Github Actions scripts
* Update dev dependencies

Docs:

* Fix Github Actions badge [fix]
* Remove David badges from README
* Update license year
* Remove license indentation

## 2.0.6

* Log response timings on chunk error [improve]

## 2.0.5

* Use `res.complete` where no `length` provided [fix]
* Transfer class consistent use of `this` [refactor]

## 2.0.4

* Deps: Update `got` dependency
* Dev: Update dev dependencies
* Dev: Use Github Actions for CI
* Docs: Update license year
* Docs: Reverse order of Changelog

## 2.0.3

* Prevent default timeout interrupting actively downloading chunks [fix]
* Shorten var reference [refactor]

## 2.0.2

* Deps: Update `got` dependency
* Fix idle timeout [fix]
* Calculate backoff correctly [fix]
* Only fire `request` event once [fix]
* Don't use deprecated `req._headers` [fix]
* Avoid deleting object properties [perf]
* Tests: Split into multiple files [refactor]

## 2.0.1

* Clear idle timeout on error [fix]
* Do not pass idle timeout to `got` [fix]
* Log idle timeouts [improve]

## 2.0.0

* `timeout` option [major]
* Drop support for Node v6 + v8 [major]
* Idle timeout [feat]
* Code style [refactor]
* Entry point file [refactor]
* Line spacing [nocode]
* Tests: Replace `fs-extra-promise` with `fs-extra`
* Dev: Swap ESLint for JSHint
* Dev: Swap Jest for Mocha+Chai
* Docs: Versioning policy
* Docs: Remove Greenkeeper badge
* Docs: Link to Travis CI with HTTPS

## 1.4.6

* Fix: Avoid stalling on errors which don't emit end event
* Fix: Reset backoff after attempt which returned bytes
* Docs: Update license year
* Dev: Add `package-lock.json` lock file
* Dev: Editor config 2 spaces for tabs

## 1.4.5

* Remove `transform` stream from log messages

## 1.4.4

* Fix: Propagate error event to output stream if `transform` option used

## 1.4.3

* Fix: Propagate all stream events to output stream if `transform` option used

## 1.4.2

* Fix: Propagate stream events to output stream if `transform` option used

## 1.4.1

* Fix: Add `cancel` method to output stream if `transform` option used

## 1.4.0

* `transform` option
* Error message for wrong range more verbose
* Define all keys on `options`
* Refactor logging
* Remove unnecessary code
* JSDoc comment document all options
* Tests small refactor
* `package.json` formatting

## 1.3.2

* Log response body when response errors
* Update dev dependencies

## 1.3.1

* Fix: Do not require `accept-ranges` header
* Update dev dependencies
* Travis CI run tests on Node v10

## 1.3.0

* `toFile` method
* Fix: Malformed range header reports range
* Code tidy: Delete `waitTimer` when timer cleared
* Code comments
* Update `got` dependency
* Update dev dependencies

## 1.2.0

* Fix: Do not ignore `options.length`
* Fix: Handle case when got stream emits end before transform stream processes last data
* Fix: Stream ends normally after error event if transfer complete
* Fix: Do not stream data if server error e.g. 404
* Fix: Do not trust `content-length` HTTP header if content encoding used
* `progress` event
* Log request headers
* Log response URL
* Log pre function calls
* Log response errors
* Set got encoding option only once (small optimization)
* Code tidy
* Tests

## 1.1.1

* Fix: Correctly handle server not returning `content-length` header
* Comments typo

## 1.1.0

* Cancellation
* `PreError` class for errors in `pre` function

## 1.0.2

* Fix: Do not stream data after protocol error (closes #3)
* README Greenkeeper.io badge

## 1.0.1

* README update

## 1.0.0

* Initial release
