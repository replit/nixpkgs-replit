#!/bin/sh
nix-shell -p nodePackages.node2nix --run 'node2nix -i node-packages.json'

