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

## Next

* Fix: Handle case when got stream emits end before transform stream processes last data
* Fix: Stream ends normally after error event if transfer complete
* `progress` event
