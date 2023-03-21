{ sources ? import nix/sources.nix
, channelName ? "nixpkgs-22.11"
, channel ? sources.${channelName}
, system ? "x86_64-linux"
}:
let
  overlay = (import ./overlay.nix) {
    inherit sources;
  };
in
import channel { inherit system; overlays = [ overlay ]; }
