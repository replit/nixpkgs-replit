{ pkgs ? import ./default.nix { } }:

pkgs.mkShell {
  buildInputs = with pkgs;
    [
      hello

      replitPackages.jdt-language-server
      replitPackages.replbox
    ];
}
