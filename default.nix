{ sources ? import nix/sources.nix
, channelName ? "nixpkgs-unstable"
, channel ? sources.${channelName}
}:
let
  overlay = (import ./overlay.nix) {
    inherit sources;
  };
in
import channel { overlays = [ overlay ]; }
