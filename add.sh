#!/usr/bin/env bash
channel=$1

# Add the channel to the overlay
nix-shell -p niv --run "niv add nixos/nixpkgs --name nixpkgs-$channel -b nixos-$channel"

# Add the channel to the update script
echo "nix-shell -p niv --run 'niv update nixpkgs-$channel -b nixos-$channel'" >> update.sh

# Add the channel to hydra
cp hydra/release-21.11.nix hydra/release-$channel.nix
sed -i "s/21\.11/$channel/g" hydra/release-$channel.nix

git add \
  nix/sources.json \
  update.sh \
  hydra/release-$channel.nix
