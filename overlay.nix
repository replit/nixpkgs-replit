self: super:

with super.lib;

let
  override = rec {
    # These packages will hide packages in the top level nixpkgs
    swift = self.callPackage ./pkgs/swift { };

    # Add our additional node packages
    nodePackages = super.nodePackages // self.callPackage ./pkgs/node-packages { };
  };
in {
  replitPackages = rec {
    # Any other packages should go in the replitPackages namespace
    jdt-language-server = self.callPackage ./pkgs/jdt-language-server { };
    replbox = self.callPackage ./pkgs/replbox { };

    # The override packages are injected into the replitPackages namespace as
    # well so they can all be built together
  } // override;
} // override

