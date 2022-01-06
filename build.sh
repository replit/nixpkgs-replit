#!/bin/sh

default=nixpkgs-unstable
channel=$default

ignore=`cat .gitignore | xargs printf -- '--exclude=%s\n'`

if [ ! -z "$1" ]; then
  channel=$1
fi

echo "Building tarball for $channel"

# Update default.nix to use the specified nix package
sed -i s/\"$default\"/\"$channel\"/g default.nix

# Build a tarball using the name of the channel
tar -czvf $channel.tar.gz \
  --exclude='./.git' \
  --exclude='./.github' \
  --exclude='./.semaphore' \
  --exclude='./.gitignore' \
  --exclude='./build.sh' \
  $ignore \
  ./

# Revert the update
sed -i s/\"$channel\"/\"$default\"/g default.nix
