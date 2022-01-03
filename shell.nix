{ pkgs ? import ./default.nix { } }:

pkgs.mkShell {
  buildInputs = with pkgs;
    [
      hello
      nodePackages.coffeescript

      replitPackages.jdt-language-server
      replitPackages.replbox
    ];
}
