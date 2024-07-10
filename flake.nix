{
  outputs =
    { self }:
    let
      system = "x86_64-linux";
    in
    {
      legacyPackages.${system} = import ./. { inherit system; };
    };
}
