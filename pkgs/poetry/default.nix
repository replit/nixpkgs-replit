{ pkgs }:
let
  python = pkgs.python310Full;

  poetry-bundle = pkgs.callPackage ./poetry-bundle.nix { };

  myPoetry = pkgs.stdenv.mkDerivation {
    name = "poetry";
    version = "1.11.1";

    buildInputs = [ pkgs.makeWrapper pkgs.python310Packages.pip pkgs.git pkgs.cacert poetry-bundle ];

    buildCommand = ''
      mkdir -p $out
      mkdir -p $out/bin

      ${python}/bin/python3 -m venv $out/env
      touch $out/env/poetry_env # This allows poetry to recognize it
                                # https://github.com/replit/poetry/blob/replit-1.1/poetry/utils/env.py#L885
                                # invoking the workaround so that poetry
                                # does not use its own venv for the project
                                # env

      $out/env/bin/pip install poetry --find-links ${poetry-bundle}/packages --no-index
      ln -s $out/env/bin/poetry $out/bin/poetry
    '';
  };
in
myPoetry
