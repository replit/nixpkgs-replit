{}:

let

  pkgs = import ./default.nix { };

in {
  pkgs.nodePackages.typescript-language-server
  pkgs.nodePackages.yarn
  pkgs.nodePackages.prettier
  pkgs.nodePackages.svelte-language-server
}
