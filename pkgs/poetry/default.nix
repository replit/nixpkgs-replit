{ pkgs }:
let
  python = pkgs.python310Full;

  myPoetry = pkgs.stdenv.mkDerivation {
    name = "poetry";
    version = "1.11.1";
    src = ./.;

    buildInputs = [ pkgs.makeWrapper ];

    installPhase = ''
      mkdir -p $out
      mkdir -p $out/bin

      ${python}/bin/python3 -m venv $out/env
      touch $out/env/poetry_env # This allows poetry to recognize it
                                # https://github.com/replit/poetry/blob/replit-1.1/poetry/utils/env.py#L885
                                # invoking the workaround so that poetry
                                # does not use its own venv for the project
                                # env

      mkdir -p $out/poetry.bundle
      tar xvf poetry.bundle.tar.gz -C $out/poetry.bundle

      $out/env/bin/pip install poetry --find-links $out/poetry.bundle --no-index

      rm -fr $out/poetry.bundle

      ln -s $out/env/bin/poetry $out/bin/poetry
    '';
  };
in
myPoetry
