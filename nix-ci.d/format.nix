{ pkgs }:
{
  format = pkgs.runCommand "nixpkgs-replit-format"
    {
      nativeBuildInputs = [ pkgs.nixpkgs-fmt ];
      src = pkgs.lib.fileset.toSource {
        root = ../.;
        fileset = pkgs.lib.fileset.intersection
          (pkgs.lib.fileset.fileFilter (file: file.hasExt "nix") ../.)
          (pkgs.lib.fileset.unions [
            ../default.nix
            ../overlay.nix
            ../hydra
            ../pkgs
          ]);
      };
    }
    ''
      nixpkgs-fmt --check "$src/default.nix" "$src/overlay.nix" "$src/hydra" "$src/pkgs"
      touch "$out"
    '';
}
