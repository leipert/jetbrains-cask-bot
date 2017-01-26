# jetbrains-cask-bot

This is a small tool which helps creating pull requests for [casks](https://github.com/caskroom/homebrew-cask) of jetbrains products.

## "Algorithm"

1.  brew update (which updates all the casks)
2.  retrieve list of latest releases from jetbrains
3.  compare list of latest releases to current versions in [homebrew-cask](https://github.com/caskroom/homebrew-cask)
4.  check if there are open pull requests which touch the outdated casks
    
    For any outdated cask which has no open PR:
    1. update version and sha256
    2. `brew cask style --fix "${cask}"`
    3. `brew cask audit --download "${cask}"`
    4. create and commit branch
    5. create PR

## Watched jetbrains products

<!-- JETBRAINS -->

<!-- JETBRAINS END -->

## Usage