{ stdenv
, ant
, maven
, fetchFromGitHub
, graalvm11-ce
, makeWrapper
, callPackage
}:
let
  nbcode = callPackage ./ant.nix { };

in stdenv.mkDerivation {
  name = "java-lsp";

  nativeBuildInputs = [ nbcode graalvm11-ce makeWrapper ];

  unpackPhase = "true";
  dontBuild = true;

  installPhase = ''
    makeWrapper ${nbcode}/bin/nbcode $out/bin/java-lsp \
      --add-flags "--jdkhome ${graalvm11-ce}" \
      --add-flags "--start-java-language-server=stdio"

    makeWrapper ${nbcode}/bin/nbcode $out/bin/java-dap \
      --add-flags "--jdkhome ${graalvm11-ce}" \
      --add-flags "--start-java-debug-adapter-server=stdio"
  '';
}
