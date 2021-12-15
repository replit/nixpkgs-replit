{}:

let

  pkgs = import ./default.nix { };

in {
  inherit (pkgs) replitPackages nodePackages;
}
