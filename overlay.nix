{ sources }:
self: super:
with super.lib;
let
  privateNodePackages = self.callPackage ./pkgs/node-packages {
    nodejs = super."nodejs-14_x";
  };

  # We have our own version of typescript-language-server here because the version in upstream nixpkgs
  # has a bug which is causing issues for code intelligence in node repls.
  # Copied from nixpkgs:
  # https://cs.github.com/NixOS/nixpkgs/blob/529ce4161a07f0b5a4a6d6cc4339d50f7cec77b5/pkgs/development/node-packages/default.nix#L474-L480
  typescript-language-server = privateNodePackages."typescript-language-server-3.1.0".override {
    nativeBuildInputs = [ self.makeWrapper ];
    postInstall = ''
      wrapProgram "$out/bin/typescript-language-server" \
        --suffix PATH : ${self.lib.makeBinPath [ self.nodePackages.typescript ]} \
        --add-flags "--tsserver-path ${self.nodePackages.typescript}/lib/node_modules/typescript/lib/"
    '';
  };

  prybar = import sources.prybar { };
in
rec {
  nodePackages = super.nodePackages // {
    inherit typescript-language-server;
  };

  python310Full = super.python310.override {
    self = python310Full;
    pythonAttr = "python310Full";
    bluezSupport = true;
    x11Support = true;
  };

  jdt-language-server = self.callPackage ./pkgs/jdt-language-server { };

  replitPackages = {
    # Version string set when building overlay
    version = "GIT_SHA_HERE";

    # Any other packages should go in the replitPackages namespace
    replbox = self.callPackage ./pkgs/replbox { };

    inherit (self) jdt-language-server;

    java-debug = self.callPackage ./pkgs/java-debug {
      inherit jdt-language-server;
      jdk = self.graalvm11-ce;
    };

    rescript-language-server = self.callPackage ./pkgs/rescript-language-server { };
    nbcode = self.callPackage ./pkgs/nbcode { };

    jest = privateNodePackages."jest-cli-23.6.0";
    coffeescript = privateNodePackages."coffeescript-2.6.1";

    basil = self.callPackage ./pkgs/basil { };

    # Also included typescript-language-server so hydra will build it for us.
    inherit typescript-language-server;

    inherit (self) python310Full;

    inherit (prybar) prybar-R prybar-clojure prybar-elisp prybar-julia prybar-lua prybar-nodejs
      prybar-ocaml prybar-python2 prybar-python3 prybar-python310 prybar-ruby prybar-scala prybar-sqlite prybar-tcl;

    stderred =
      if builtins.hasAttr "stderred" super
      then super.callPackage ./pkgs/stderred { }
      else { };

    dapPython = super.callPackage ./pkgs/dapPython { };

    moduleit = super.callPackage ./pkgs/moduleit { };

    modules =
      let
        mkModule = path: self.callPackage ./pkgs/moduleit/entrypoint.nix {
          configPath = path;
        };
      in
      {
        rust = mkModule ./modules/rust.nix;
        go = mkModule ./modules/go.nix;
        swift = mkModule ./modules/swift.nix;
        python = mkModule ./modules/python.nix;
      };

  };
}

