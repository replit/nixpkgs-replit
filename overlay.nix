self: super:

with super.lib;

let
  nodePackages = self.callPackage ./pkgs/node-packages { };

  override = {
    # These packages will hide packages in the top level nixpkgs
  };
in {
  replitPackages = rec {
    # Any other packages should go in the replitPackages namespace
    jdt-language-server = self.callPackage ./pkgs/jdt-language-server { };
    replbox = self.callPackage ./pkgs/replbox { };
    jest = nodePackages."jest-cli-23.6.0";
    coffeescript = nodePackages.coffeescript;
    rescript-language-server = self.callPackage ./pkgs/rescript-language-server { };

    # The override packages are injected into the replitPackages namespace as
    # well so they can all be built together
  } // override;
} // override

