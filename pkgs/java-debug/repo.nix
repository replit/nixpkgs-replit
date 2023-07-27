{ stdenv
, maven
, jdk
, src
, patches
}:
stdenv.mkDerivation {
  inherit src patches;
  name = "java-debug-repo";

  dontConfigure = true;
  buildInputs = [ maven jdk ];
  buildPhase = "${maven}/bin/mvn -Dmaven.repo.local=$out package";

  # keep only *.{pom,jar,sha1,nbm} and delete all ephemeral files with lastModified timestamps inside
  installPhase = ''
    echo $out

    find $out -type f -name \*.lastUpdated -delete
    find $out -type f -name resolver-status.properties -delete
    find $out -type f -name _remote.repositories -delete
  '';

  # don't do any fixup
  dontFixup = true;
  outputHashAlgo = "sha256";
  outputHashMode = "recursive";
  outputHash = "dKxgLF7Tm2yB7cJ3lRdWdbXrJYvB4YugPjd9rl1XhLk=";
}
