{ pkgs ? import <nixpkgs> { overlays = [ (import ./default.nix) ]; } }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    # prybar-python3 prybar-python2 prybar-lua prybar-clojure
    # prybar-elisp prybar-ocaml prybar-scala prybar-sqlite prybar-tcl

    upm
    rfbproxy
  ];
}
