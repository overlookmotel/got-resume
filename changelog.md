# Changelog

## 1.0.0

* Initial release

## 1.0.1

* README update

## 1.0.2

* Fix: Do not stream data after protocol error (closes #3)
* README Greenkeeper.io badge

## 1.1.0

* Cancellation
* `PreError` class for errors in `pre` function

## 1.1.1

* Fix: Correctly handle server not returning `content-length` header
* Comments typo

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

## 1.3.0

* `toFile` method
* Fix: Malformed range header reports range
* Code tidy: Delete `waitTimer` when timer cleared
* Code comments
* Update `got` dependency
* Update dev dependencies

## 1.3.1

* Fix: Do not require `accept-ranges` header
* Update dev dependencies
* Travis CI run tests on Node v10

## 1.3.2

* Log response body when response errors
* Update dev dependencies

## Next

* Error message for wrong range more verbose
* Define all keys on `options`
* Refactor logging
* Remove unnecessary code
* JSDoc comment document all options
* Tests small refactor
