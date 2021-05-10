self: super:

with super.lib;

let
  prybars = recurseIntoAttrs (self.callPackage ./pkgs/prybar {});
in

rec {
  inherit (prybars) prybar-python3 prybar-python2 prybar-lua prybar-clojure
    prybar-elisp prybar-ocaml prybar-scala prybar-sqlite prybar-tcl;

  upm = self.callPackage ./pkgs/upm {};

  rfbproxy = self.callPackage ./pkgs/rfbproxy {};
  
  swift = self.callPackage ./pkgs/swift {};
}

