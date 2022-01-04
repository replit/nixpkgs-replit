{ sources ? import nix/sources.nix
, channel ? sources."nixpkgs-unstable"
}:
import channel {overlays = [ (import ./overlay.nix) ];}
