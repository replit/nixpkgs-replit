{ pkgs ? import ./default.nix { } }:

pkgs.mkShell {
  buildInputs = with pkgs;
    [
      hello

      replitPackages.coffeescript
      replitPackages.jdt-language-server
      replitPackages.rescript-language-server
      replitPackages.replbox
    ];
}
