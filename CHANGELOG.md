# Change Log

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

### Added

- Add PyCharm Anaconda versions: #24

## [3.1.0] 2020-08-28

### Changed

- Delete branches with the API: #19, #20
- Updated dependencies: #21

## [3.0.0] 2020-07-30

### Breaking

- Switched to GitHub Actions: #8, #9, #11, #16

### Changed

- Refactored code a lot: #14
- Updated dependencies: #17, #12
- Mount dmg in order to check it, more resilient: #13

### Added

- Support for asdf: #15

### Fixed

- Regex parsing of homebrew casks: #18

## [2.1.0] 2019-09-03

### Changed

- Update dependencies
- Cache Ruby dependencies

### Fixed

- Automatically update of URLs

## [2.0.4] 2019-02-16

### Fixed

- Fix GitLab CI trigger by making some checks on the jetbrains data more failure resistent

## [2.0.3] 2019-01-24

### Fixed

- Build field for TBA

## [2.0.2] 2019-01-24

### Fixed

- Travis: Use pre-installed brew formulas if available

## [2.0.1] 2019-01-09

### Fixed

- Build on Travis CI should work again

## [2.0.0] 2018-12-11

### Added

- Automate execution completely:
  - Every hour a small check on GitLab CI is executed.
    If a new version of a jetbrains product has been released, we trigger a script on Travis CI.
  - Travis CI updates the cask and creates the PRs if necessary
- Detection for jetbrains products which have no cask

### Removed

- Unnecessary caching due to complete automation

### Changed

- Updated prettier and related config
- Updated all dependencies

## [1.11.1] 2018-03-02

### Fixed

- Delete existing branch before creating a new branch

## [1.11.0] 2018-01-29

### Changed

- Updated dependencies

## [1.10.0] 2017-12-03

### Changed

- goland is now a released product

## [1.9.0] 2017-11-03

### Changed

- renamed gogland to goland

## [1.8.0] 2017-10-09

### Fixed

- audit.sh script. An recent HC update broke it

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
