#!/usr/bin/env bash
nix-shell -p niv --run 'niv update nixpkgs-unstable -b nixpkgs-unstable'
nix-shell -p niv --run 'niv update nixpkgs-21.11 -b nixos-21.11'
nix-shell -p niv --run 'niv update nixpkgs-22.05 -b nixos-22.05'
nix-shell -p niv --run 'niv update nixpkgs-22.11 -b nixos-22.11'
nix-shell -p niv --run 'niv update nixpkgs-23.05 -b nixos-23.05'
nix-shell -p niv --run 'niv update nixpkgs-23.11 -b nixos-23.11'
nix-shell -p niv --run 'niv update nixpkgs-24.05 -b nixos-24.05'
