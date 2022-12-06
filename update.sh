#!/usr/bin/env bash
nix-shell -p niv --run 'niv update nixpkgs-unstable -b nixpkgs-unstable'
nix-shell -p niv --run 'niv update nixpkgs-21.11 -b nixos-21.11'
nix-shell -p niv --run 'niv update nixpkgs-22.05 -b nixos-22.05'
