{}:

let
  sources = import ../nix/sources.nix;
  pkgs = import ../default.nix {
    sources = sources;
    channel = sources.nixpkgs-unstable;
  };
in
{
  inherit (pkgs) replitPackages;
  inherit (pkgs.nodePackages) typescript-language-server yarn prettier svelte-language-server;
}
