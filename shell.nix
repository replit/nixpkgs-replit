{ pkgs ? import ./default.nix { } }:

pkgs.mkShell { buildInputs = with pkgs; [ hello ]; }
