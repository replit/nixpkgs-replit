{ callPackage, python3, python2, lua5_1, readline, clojure, tcl }:
let
  buildPrybar = import ./buildPrybar.nix;
in
{
    # TODO: These don't quite work yet

    # Won't build
    # prybar-R = callPackage (buildPrybar { language = "R"; buildInputs = [ pkgs.R ]; }) {};

    # Julia 1.1 doesn't seem to be on nix
    # prybar-julia = callPackage (buildPrybar { language = "julia"; buildInputs = [ julia_13 ]; }) {};

    # Has problem reading from prybar_assets. Seems like a bug with the impl.
    # prybar-nodejs = callPackage (buildPrybar { language = "nodejs"; buildInputs = [ ]; }) {};

    # Ruby 2.5 is deprecated!
    # prybar-ruby = callPackage (buildPrybar { language = "ruby"; buildInputs = [ ruby_2_5 ]; }) {};

    # Untested, spidermonkey not supported on darwin. Feel free to test on linux.
    # prybar-spidermonkey = callPackage (buildPrybar { language = "spidermonkey"; buildInputs = [ spidermonkey ]; }) {};

    prybar-python2 = callPackage (buildPrybar { language = "python2"; buildInputs = [ python2 ]; }) {};

    prybar-python3 = callPackage (buildPrybar { language = "python3"; buildInputs = [ python3 ]; }) {};

    prybar-lua = callPackage (buildPrybar { language = "lua"; buildInputs = [ lua5_1 readline ]; }) {};

    prybar-clojure = callPackage (buildPrybar { language = "clojure"; buildInputs = [ clojure ]; }) {};

    prybar-elisp = callPackage (buildPrybar { language = "elisp"; }) {};

    prybar-ocaml = callPackage (buildPrybar { language = "ocaml"; }) {};

    prybar-scala = callPackage (buildPrybar { language = "scala"; }) {};

    prybar-sqlite = callPackage (buildPrybar { language = "sqlite"; }) {};

    prybar-tcl = callPackage (buildPrybar { language = "tcl"; buildInputs = [ tcl ]; }) {};
}
