{ sources ? import nix/sources.nix
, channelName ? "nixpkgs-23.11"
, channel ? sources.${channelName}
, system ? "x86_64-linux"
, ...
} @ args:
let
  overlay = (import ./overlay.nix) {
    inherit sources channelName;
  };
in
import channel (args // { inherit system; overlays = [ overlay ]; })
