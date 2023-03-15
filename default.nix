{ sources ? import nix/sources.nix
, channelName ? "nixpkgs-22.11"
, channel ? sources.${channelName}
}:
let
  overlay = (import ./overlay.nix) {
    inherit sources;
  };
in
import channel { overlays = [ overlay ]; }
