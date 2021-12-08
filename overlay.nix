self: super:

with super.lib;

rec {
  hello = self.callPackage ./pkgs/hello { };

  swift = self.callPackage ./pkgs/swift { };

  replitPackages = {
    jdt-language-server = self.callPackage ./pkgs/jdt-language-server { };
  };
}

