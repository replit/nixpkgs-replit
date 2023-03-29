{ pkgs }:
pkgs.python310Packages.buildPythonPackage rec {
  pname = "pip";
  version = "th-not-venv";
  format = "other";

  src = pkgs.fetchFromGitHub {
    owner = "replit";
    repo = pname;
    rev = "th-not-venv";
    sha256 = "sha256-tHyQREQ6gVi2N1JnJe/rEnaemYuhf1Wpf2gO1lwzYbo=";
    name = "${pname}-${version}-source";
  };

  nativeBuildInputs = [ pkgs.python310Packages.bootstrapped-pip ];

  # pip detects that we already have bootstrapped_pip "installed", so we need
  # to force it a little.
  pipInstallFlags = [ "--ignore-installed" ];

  # Pip wants pytest, but tests are not distributed
  doCheck = false;

  meta = {
    description = "The PyPA recommended tool for installing Python packages";
    license = with pkgs.lib.licenses; [ mit ];
    homepage = "https://github.com/replit/pip";
  };
}