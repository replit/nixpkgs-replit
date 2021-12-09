{ pkgs ? import ./default.nix { } }:

pkgs.mkShell {
  buildInputs = with pkgs;
    [
      hello

      # Swift takes a lot of compute to build, it is excluded from CI for now.
      # swift

      replitPackages.jdt-language-server
      replitPackages.replbox
    ];
}
