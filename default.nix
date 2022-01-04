{ sources ? import nix/sources.nix }:
import sources."nixpkgs-unstable" {overlays = [ (import ./overlay.nix) ];}
