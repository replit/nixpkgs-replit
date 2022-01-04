{}:

let

  pkgs = import ./default.nix { };

in
{
  inherit (pkgs.nodePackages) typescript-language-server yarn prettier svelte-language-server;
  inherit (pkgs) replitPackages;
}
