{ stdenv
, python3
, fetchFromGitHub
}:
stdenv.mkDerivation rec {
  name = "basil";

  src = fetchFromGitHub {
    owner = "basilTeam";
    repo = "basil";
    rev = "575b4590d45144f80d74ddc0bfc133cad4b7c04d";
    sha256 = "sha256:0s0mk5l4xd4y96q1mdx12cgm99n9r85xqyrgc5i8jx0bhfpjbdpm";
  };

  buildPhase = ''
	  ${python3}/bin/python3 build.py basil-release
  '';

  installPhase = ''
		mkdir -p $out
		cp -r bin $out
  '';
}
