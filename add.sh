#!/bin/sh
channel=$1

# Add the channel to the overlay
nix-shell -p niv --run "niv add nixos/nixpkgs --name nixpkgs-$channel -b release-$channel"

# Add the channel to the update script
echo "nix-shell -p niv --run 'niv update nixpkgs-$channel -b release-$channel'" >> update.sh

# Add the channel to hydra
cp hydra/release-21.11.nix hydra/release-$channel.nix
sed -i "s/21\.11/$channel/g" hydra/release-$channel.nix

# Add the channel to semaphore
sed -i "s/^\(.*\)nixpkgs-unstable/\1nixpkgs-$channel\n&/" .semaphore/semaphore.yml
sed -i "s/^\(.*\)nixpkgs-unstable/\1nixpkgs-$channel\n&/" .semaphore/push.yml

git add \
  nix/sources.json \
  update.sh \
  hydra/release-$channel.nix \
  .semaphore/semaphore.yml \
  .semaphore/push.yml
