{
  outputs =
    { self }:
    let
      system = "x86_64-linux";
    in
    {
      legacyPackages.${system} = import ./. { inherit system; };
      checks.${system} = import ./nix-ci.d/format.nix {
        pkgs = self.legacyPackages.${system};
      };
    };
}
