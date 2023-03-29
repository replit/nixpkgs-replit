{ pkgs }:

let python = pkgs.python310Full;

pypkgs = pkgs.python310Packages;

pyseto = pypkgs.buildPythonPackage rec {
  pname = "pyseto";
  version = "1.7.1";

  src = pypkgs.fetchPypi {
    inherit pname version;
    hash = "sha256-pbbVjtzzmQ/aJnMWcjhcZMLn4Lxxj5ADjQ6wUoF4Fpo=";
  };

  propagatedBuildInputs = with pypkgs; [
    iso8601
    pycryptodomex
    passlib
    cryptography
    argon2-cffi
  ];

  doCheck = false;
};

in
pypkgs.buildPythonPackage rec {
  pname = "replit-py";
  version = "1.15.9";
  format = "pyproject";

  src = pkgs.fetchFromGitHub {
    owner = "replit";
    repo = "replit-py";
    rev = "master";
    hash = "sha256-r1WXz7bDv6Q+vbBT+o8aHQ7uNQ8iauAzGsEXaTGVt1A=";
  };

  postPatch = ''
    substituteInPlace pyproject.toml \
      --replace "typing_extensions = \"^3.7.4\"" "typing_extensions = \"^4.3.0\""
  '';

  nativeBuildInputs = [
    pkgs.replitPackages.poetry
  ];

  propagatedBuildInputs = with pypkgs; [
    protobuf
    pyseto
    typing-extensions
    aiohttp
    flask
  ];
}