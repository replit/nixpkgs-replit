{ sources ? import nix/sources.nix
, channelName ? "nixpkgs-24.11"
, channel ? sources.${channelName}
, system ? "x86_64-linux"
, config ? { }
}:
let
  overlay = (import ./overlay.nix) {
    inherit sources channelName;
  };
in
import channel { inherit config system; overlays = [ overlay ]; }
