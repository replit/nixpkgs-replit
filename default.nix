{ sources ? import nix/sources.nix }:
import sources.nixpkgs { overlays = [ (import ./overlay.nix) ]; }
