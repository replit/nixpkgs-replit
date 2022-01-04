self: super:

with super.lib;

let
  nodePackages = self.callPackage ./pkgs/node-packages {
    nodejs = super."nodejs-14_x";
  };

  override = {
    # These packages will hide packages in the top level nixpkgs
  };
in
{
  replitPackages = rec {
    # Any other packages should go in the replitPackages namespace
    replbox = self.callPackage ./pkgs/replbox { };

    jdt-language-server = self.callPackage ./pkgs/jdt-language-server { };
    rescript-language-server = self.callPackage ./pkgs/rescript-language-server { };

    jest = nodePackages."jest-cli-23.6.0";
    coffeescript = nodePackages."coffeescript-2.6.1";

    # The override packages are injected into the replitPackages namespace as
    # well so they can all be built together
  } // override;
} // override

