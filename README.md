# jetbrains-cask-bot

This is a small tool which helps creating pull requests for [casks](https://github.com/caskroom/homebrew-cask) of jetbrains products.

## "Algorithm"

1.  brew update (which updates all the casks)
2.  retrieve list of latest releases from jetbrains
3.  compare list of latest releases to current versions in [homebrew-cask](https://github.com/caskroom/homebrew-cask)
4.  check if there are open pull requests which touch the outdated casks

    For any outdated cask which has no open PR:

    1.  update version and sha256
    2.  `brew cask style --fix "${cask}"`
    3.  `brew cask audit --download "${cask}"`
    4.  create and commit branch
    5.  create PR

## Watched jetbrains products

<!-- JETBRAINS -->

- appcode
- clion
- datagrip
- goland
- intellij-idea
- intellij-idea-ce
- jetbrains-toolbox
- mps
- phpstorm
- pycharm
- pycharm-ce
- pycharm-edu
- rider
- rubymine
- webstorm
- youtrack-workflow

<!-- JETBRAINS END -->

## Usage

Pre-requisites:

- node, yarn, git, p7zip
- brew with tap brew-cask
- copy `cp env.example.sh env.sh` and fill the file in

Then simply run:

```bash
bash ./jetbrains-cask-bot.sh
```
