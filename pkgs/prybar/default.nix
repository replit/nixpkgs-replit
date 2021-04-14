{ callPackage, python3, python2, lua5_1, readline, clojure, tcl }:
let
  buildPrybar = import ./buildPrybar.nix;
in
{
    # TODO: These don't quite work yet

    # Won't build
    # prybar-R = callPackage (buildPrybar { language = "R"; deps = [ pkgs.R ]; }) {};

    # Julia 1.1 doesn't seem to be on nix
    # prybar-julia = callPackage (buildPrybar { language = "julia"; deps = [ julia_13 ]; }) {};

    # Has problem reading from prybar_assets. Seems like a bug with the impl.
    # prybar-nodejs = callPackage (buildPrybar { language = "nodejs"; deps = [ ]; }) {};

    # Ruby 2.5 is deprecated!
    # prybar-ruby = callPackage (buildPrybar { language = "ruby"; deps = [ ruby_2_5 ]; }) {};

    # Untested, spidermonkey not supported on darwin. Feel free to test on linux.
    # prybar-spidermonkey = callPackage (buildPrybar { language = "spidermonkey"; deps = [ spidermonkey ]; }) {};

    prybar-python2 = callPackage (buildPrybar { language = "python2"; deps = [ python2 ]; }) {};

    prybar-python3 = callPackage (buildPrybar { language = "python3"; deps = [ python3 ]; }) {};

    prybar-lua = callPackage (buildPrybar { language = "lua"; deps = [ lua5_1 readline ]; }) {};

    prybar-clojure = callPackage (buildPrybar { language = "clojure"; deps = [ clojure ]; }) {};

    prybar-elisp = callPackage (buildPrybar { language = "elisp"; deps = [ ]; }) {};

    prybar-ocaml = callPackage (buildPrybar { language = "ocaml"; deps = [ ]; }) {};

    prybar-scala = callPackage (buildPrybar { language = "scala"; deps = [ ]; }) {};

    prybar-sqlite = callPackage (buildPrybar { language = "sqlite"; deps = [ ]; }) {};

    prybar-tcl = callPackage (buildPrybar { language = "tcl"; deps = [ tcl ]; }) {};
}
