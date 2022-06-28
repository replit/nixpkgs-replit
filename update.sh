#!/bin/sh
nix-shell -p niv --run 'niv update nixpkgs-21.11 -b release-21.11'
nix-shell -p niv --run 'niv update nixpkgs-unstable -b nixos-unstable'

nix-shell -p niv --run 'niv update nixpkgs-22.05 -b release-22.05'
