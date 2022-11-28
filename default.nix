{ sources ? import nix/sources.nix
, channel ? sources."nixpkgs-unstable"
}:
let overlay = (import ./overlay.nix) {
  inherit sources;
};
in
import channel {overlays = [overlay];}
