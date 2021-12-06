self: super:

with super.lib;

rec {
  hello = self.callPackage ./pkgs/hello { };
}

