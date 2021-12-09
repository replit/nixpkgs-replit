{ mkYarnPackage
, fetchFromGitHub
}:
mkYarnPackage rec {
  name = "replbox";

  src = fetchFromGitHub {
    owner = "replit";
    repo = "replbox";
    rev = "za-terminal";
    sha256 = "1zrlwin9m2hq2qfh2m3h0qmprjkphrqkb9x48wxahdi89zb66aq0";
  };
}
