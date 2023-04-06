{ pkgs }:
let python = (pkgs.python310Full.withPackages (ps: [ps.pip]));
in
pkgs.stdenvNoCC.mkDerivation rec {
  pname = "poetry-bundle";
  version = "replit-1.1";
  src = pkgs.fetchFromGitHub {
    owner = "replit";
    repo = "poetry";
    rev = version;
    sha256 = "sha256-KKm6+i8ilPRx19wNaeDjrypdLCqgYE1JKwt2USx7HHk=";
  };

  buildInputs = [ python pkgs.toml2json pkgs.jq ];

  buildPhase = ''
    mkdir -p $out
    VERSION=$(toml2json pyproject.toml | jq '.tool.poetry.version' --raw-output)
    POETRY_TAR_FILE="$out/poetry-''${VERSION}.tar.gz"
    tar cz --sort=name --mtime='@1' --owner=0 --group=0 --numeric-owner -P -f "$POETRY_TAR_FILE" .
    pip download "$POETRY_TAR_FILE" -d $out/packages
    rm "$POETRY_TAR_FILE"
  '';

  dontInstall = true;

  outputHashMode = "recursive";
  outputHash = "sha256-bSRDs4KlLbK7TQS8br+phr0N1sXrjYc55PEY/GmuYug=";
  outputHashAlgo = "sha256";
}
