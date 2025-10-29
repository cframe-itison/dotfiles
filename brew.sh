#!/usr/bin/env bash

# Install command-line tools using Homebrew.

# Make sure we’re using the latest Homebrew.
brew update

# Upgrade any already-installed formulae.
brew upgrade

# Save Homebrew’s installed location.
BREW_PREFIX=$(brew --prefix)

# Install GNU core utilities (those that come with macOS are outdated).
# Don’t forget to add `$(brew --prefix coreutils)/libexec/gnubin` to `$PATH`.
brew install coreutils
ln -s "${BREW_PREFIX}/bin/gsha256sum" "${BREW_PREFIX}/bin/sha256sum"

# Install some other useful utilities like `sponge`.
brew install moreutils
# Install GNU `find`, `locate`, `updatedb`, and `xargs`, `g`-prefixed.
brew install findutils
# Install GNU `sed`, overwriting the built-in `sed`.
brew install gnu-sed --with-default-names
# Install a modern version of Bash.
brew install bash
brew install bash-completion2

# Switch to using brew-installed bash as default shell
if ! fgrep -q "${BREW_PREFIX}/bin/bash" /etc/shells; then
  echo "${BREW_PREFIX}/bin/bash" | sudo tee -a /etc/shells;
  chsh -s "${BREW_PREFIX}/bin/bash";
fi;

# Install `wget`.
brew install wget

# Install GnuPG to enable PGP-signing commits.
brew install gnupg
brew install pinentry-mac

# Install more recent versions of some macOS tools.
brew install vim --with-override-system-vi
brew install grep
brew install openssl
brew install screen

# Install other useful binaries.
# brew install 1password
brew install dashlane
# brew install ack
# brew install adr-tools
brew install basecamp
# brew install chefdk
# brew install docker --cask
# brew install dropbox
brew install firefox
# brew install geoip
brew install gh
brew install git
brew install git-lfs
# brew install github
# brew install gitx
brew install google-chrome
# brew install launchcontrol
brew install microsoft-auto-update
brew install microsoft-edge
brew install microsoft-office
brew install microsoft-teams
# brew install mysql@5.7
brew install onedrive
brew install paparazzi
# brew install rbenv
# brew install rbenv-chefdk
# brew install redis
brew install sequel-ace
# brew install skitch
brew install slack
brew install tuple
brew install visual-studio-code
# brew install watch
brew install rectangle

# Install the Herok command-line client
# brew tap heroku/brew
# brew install heroku

# Remove outdated versions from the cellar.
brew cleanup
