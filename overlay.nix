self: super:

with super.lib;

rec {
  hello = self.callPackage ./pkgs/hello { };

  swift = self.callPackage ./pkgs/swift { };
}

