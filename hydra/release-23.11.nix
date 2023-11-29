{}:

let
  sources = import ../nix/sources.nix;
  pkgs = import ../default.nix {
    sources = sources;
    channel = sources."nixpkgs-23.11";
  };
in
{
  inherit (pkgs) replitPackages;
  inherit (pkgs.nodePackages) typescript-language-server yarn prettier svelte-language-server;
}
