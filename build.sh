#!/bin/sh

default=nixpkgs-22.11
channel=$default

ignore=`cat .gitignore | xargs printf -- '--exclude=%s\n'`

if [ ! -z "$1" ]; then
  channel=$1
fi

echo "Building tarball for $channel"

# Update default.nix to use the specified nix package
sed -i s/\"$default\"/\"$channel\"/g default.nix

# Update default.nix to use the specified nix package
sha=`git rev-parse --verify HEAD`
sed -i s/\"GIT_SHA_HERE\"/\"$sha\"/g overlay.nix

# Build a tarball using the name of the channel
tar -czvf $channel.tar.gz \
  --transform 's,^\.,nixpkgs,' \
  --exclude='./.git' \
  --exclude='./.github' \
  --exclude='./.semaphore' \
  --exclude='./.gitignore' \
  --exclude='./build.sh' \
  $ignore \
  ./

# Revert the update
sed -i s/\"$channel\"/\"$default\"/g default.nix
sed -i s/\"$sha\"/\"GIT_SHA_HERE\"/g overlay.nix
