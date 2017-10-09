# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

TODO: add at least one Added, Changed, Deprecated, Removed, Fixed or Security section

## [1.8.0] 2017-10-09

### Fixed
- audit.sh script. An recent HC broke it

## [1.7.1] 2017-09-26

### Fixed
- Usage of FileCache plugin

## [1.7.0] 2017-09-26

### Changed
- Updated dependencies

## [1.6.1] 2017-09-17

### Fixed
- Do not bail out if missing casks cannot be loaded

## [1.6.0] 2017-09-13

### Added
- Check if app name in Cask matches app name in downloaded dmg.

## [1.5.2] 2017-08-17

### Fixed
- Execution of updates was broken since `1.5.0`

## [1.5.1] 2017-08-13

### Fixed
- update dependencies

## [1.5.0] 2017-08-12

### Changed
- Improved performance by caching away a lot of things
    - mtimes of Casks are cached, so that we do just reload data from the Casks, if needbe
    - Missing Casks are cached for three days
    - Jetbrains API is cached for a few minutes

### Fixed
- Better error handling when something fails while patching a cask

## [1.4.0] 2017-08-04
### Changed
- Move rider to `release` channel

## [1.3.1] 2017-07-14
### Changed
- Temporary fix of rider version to 2017.1

## [1.3.0] 2017-05-27

### Added
- rider@eap

## [1.2.1] 2017-05-15
### Fixed
- Change gogland version string

## [1.2.0] 2017-04-19

### Added
- Support for `eap` release channel
- gogland@eap

### Changed
- update `prettier`
- updated dependencies
- better summary output message

## [1.1.1] 2017-03-28
### Fixed
- remove duplicate build version from branch name

## [1.1.0] 2017-03-28
### Changed
- versions of casks now contain the build number
