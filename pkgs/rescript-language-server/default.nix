{ stdenv
, fetchurl
, nodejs
, unzip
, makeWrapper
}:

stdenv.mkDerivation rec {
  pname = "rescript-lang-server";
  version = "1.1.3";

  src = fetchurl {
    url = "https://github.com/rescript-lang/rescript-vscode/releases/download/${version}/rescript-vscode-${version}.vsix";
    sha256 = "0zahvyxxqs7q6k7p81bzq59jzbkiikp1vkpxpgfy6c35cj4kww5r";
  };

  buildInputs = [
    nodejs
  ];

  nativeBuildInputs = [
    unzip
    makeWrapper
  ];

  unpackCmd = "unzip $curSrc";

  installPhase = ''
    mkdir -p $out/share
    cp -r ./ $out/share

    makeWrapper ${nodejs}/bin/node $out/bin/rescript-language-server \
      --run "cd $out/share" \
      --add-flags "./server/out/server.js" \
      --add-flags "--stdio"
    '';
}
