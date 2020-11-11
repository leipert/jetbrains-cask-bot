# jetbrains-cask-bot

This is a small tool which helps creating pull requests for [casks][casks] of jetbrains products.

## "Algorithm"

1.  brew update (which updates all the casks)
2.  retrieve list of latest releases from jetbrains
3.  compare list of latest releases to current versions in [homebrew-cask][casks]
4.  check if there are open pull requests which touch the outdated casks

    For any outdated cask which has no open PR:

    1.  update version and sha256
    2.  `brew cask style --fix "${cask}"`
    3.  `brew cask audit --download "${cask}"`
    4.  create and commit branch
    5.  create PR

This algorithm is runs on [GitHub Actions][gha]. The workflow definition can be found [here][wfd].

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
- pycharm-with-anaconda-plugin
- pycharm-ce-with-anaconda-plugin
- pycharm-edu
- rider
- rubymine
- webstorm
- youtrack-workflow

<!-- JETBRAINS END -->

## Usage

Pre-requisites:

- node, yarn, git, p7zip, coreutils, findutils
- brew with tap brew-cask
- copy `cp env.example.sh env.sh` and fill the file in

Then simply run:

```bash
bash ./jetbrains-cask-bot.sh
```

[casks]: https://github.com/caskroom/homebrew-cask
[gha]: https://github.com/leipert/jetbrains-cask-bot/actions
[wfd]: https://github.com/leipert/jetbrains-cask-bot/blob/master/.github/workflows/main.yml
