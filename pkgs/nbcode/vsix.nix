{ stdenv
, unzip
, fetchurl
}:
stdenv.mkDerivation {
  name = "nbcode-vsix";
  version = "12.6.301";

  src = fetchurl {
    url = "https://asf.gallery.vsassets.io/_apis/public/gallery/publisher/asf/extension/apache-netbeans-java/12.6.301/assetbyname/Microsoft.VisualStudio.Services.VSIXPackage";
    sha256 = "0iaqp953zgmnvbphzs8l2pjmfdrcy2m6rir1d2briniy37a350qf";
  };

  unpackCmd = "${unzip}/bin/unzip $curSrc -d ./build";
  dontConfigure = true;
  dontBuild = true;
  installPhase = "cp -a extension/nbcode $out";
}
