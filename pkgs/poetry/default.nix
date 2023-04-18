{ pkgs }:
let
  python = pkgs.python310Full;

  myPoetry = pkgs.stdenvNoCC.mkDerivation {
    name = "poetry-in-venv";
    version = "1.0.1";
    buildInputs = [ pkgs.makeWrapper pkgs.poetry python ];

    dontPatchShebangs = true;

    buildCommand = ''
      mkdir -p $out
      ${pkgs.poetry}/bin/poetry new --name poetry-in-venv $out/
      cd $out
      export POETRY_CACHE_DIR=$out/.cache
      export POETRY_VIRTUALENVS_IN_PROJECT=true
      ${pkgs.poetry}/bin/poetry add https://github.com/replit/poetry/archive/0f0b1b2b7e476e778019ee069a3d40eec622d71b.tar.gz 
      # ${pkgs.poetry}/bin/poetry add argparse3

      find $out/.venv -name "*.pyc" -exec rm {} \;

      # stolen from https://github.com/NixOS/nixpkgs/blob/9321f2c2a81148fdd5a8766889e28b21c521b3e2/pkgs/development/interpreters/python/cpython/default.nix#L469
      find $out/.venv -name "*.py" | ${python}/bin/python -m compileall -q -f -x "lib2to3" -i -
      find $out/.venv -name "*.py" | ${python}/bin/python -O  -m compileall -q -f -x "lib2to3" -i -
      find $out/.venv -name "*.py" | ${python}/bin/python -OO -m compileall -q -f -x "lib2to3" -i -

      find $out/.venv -name "RECORD" -exec rm {} \;
      rm -fr $POETRY_CACHE_DIR

      mkdir -p $out/bin
      ln -s $out/.venv/bin/poetry $out/bin/poetry
    '';

    outputHashMode = "recursive";
    outputHash = "sha256-W+Urw2y5EtNh0ofhAYlPNFXdl9gKzmWX7w58lVw3rwA=";
    outputHashAlgo = "sha256";
  };
in
myPoetry
