#!/bin/sh
nix-shell -p nodePackages.node2nix --run 'node2nix -14 --version'
nix-shell -p nodePackages.node2nix --run 'node2nix -14 -i node-packages.json'
nix-shell -p nixpkgs-fmt --run 'nixpkgs-fmt .'

