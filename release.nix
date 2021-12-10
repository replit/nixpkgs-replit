{}:

let

  pkgs = import ./default.nix { };

in
with pkgs; {
  inherit swift;

  inherit (replitPackages) jdt-language-server replbox;
}
