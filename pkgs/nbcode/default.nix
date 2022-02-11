{ stdenv
, graalvm11-ce
, makeWrapper
, callPackage
}:
let
  nbcode-vsix = callPackage ./vsix.nix { };

in stdenv.mkDerivation {
  name = "nbcode";

  nativeBuildInputs = [ nbcode-vsix graalvm11-ce makeWrapper ];

  unpackPhase = "true";
  dontBuild = true;

  installPhase = ''
    makeWrapper ${nbcode-vsix}/bin/nbcode $out/bin/java-lsp \
      --add-flags "--jdkhome ${graalvm11-ce}" \
      --add-flags "--start-java-language-server=stdio"

    makeWrapper ${nbcode-vsix}/bin/nbcode $out/bin/java-dap \
      --add-flags "--jdkhome ${graalvm11-ce}" \
      --add-flags "--start-java-debug-adapter-server=stdio"
  '';
}
