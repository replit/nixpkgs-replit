{ pkgs }:
pkgs.stdenvNoCC.mkDerivation rec {
  pname = "poetry-bundle";
  version = "replit-1.1";
  src = pkgs.fetchFromGitHub {
    owner = "replit";
    repo = "poetry";
    rev = version;
    sha256 = "sha256-KKm6+i8ilPRx19wNaeDjrypdLCqgYE1JKwt2USx7HHk=";
  };

  buildInputs = [ pkgs.python310Packages.pip pkgs.toml2json pkgs.jq ];

  buildPhase = ''
    mkdir -p $out
    VERSION=$(toml2json pyproject.toml | jq '.tool.poetry.version' --raw-output)
    POETRY_TAR_FILE="$out/poetry-''${VERSION}.tar.gz"
    tar czf "$POETRY_TAR_FILE" ./*
    ls -la $out
    pip download "$POETRY_TAR_FILE" -d $out/packages
    rm "$POETRY_TAR_FILE"
  '';

  dontInstall = true;

  outputHashMode = "recursive";
  outputHash = "sha256-dvQQcvjDg+bsKtM02II7UIkDJI4P96Lch4En773rkQk=";
  outputHashAlgo = "sha256";
}
