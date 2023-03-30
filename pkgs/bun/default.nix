{ lib
, stdenvNoCC
, callPackage
, fetchurl
, autoPatchelfHook
, unzip
, openssl
, writeShellScript
, curl
, jq
, common-updater-scripts
}:

stdenvNoCC.mkDerivation rec {
  version = "0.5.8";
  pname = "bun";

  src = fetchurl {
    url = "https://github.com/oven-sh/bun/releases/download/bun-v0.5.8/bun-linux-x64.zip";
    sha256 = "1khbhbks3vs6kj9rh8132gwmg1ps3grbanw54gnn610hqns9kn7q";
  };

  strictDeps = true;
  nativeBuildInputs = [ unzip ] ++ lib.optionals stdenvNoCC.isLinux [ autoPatchelfHook ];
  buildInputs = [ openssl ];

  dontConfigure = true;
  dontBuild = true;

  installPhase = ''
    runHook preInstall
    install -Dm 755 ./bun $out/bin/bun
    runHook postInstall
  '';
}
