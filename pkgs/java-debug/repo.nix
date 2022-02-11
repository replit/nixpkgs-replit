{ stdenv
, maven
, fetchFromGitHub
, graalvm11-ce
}:
stdenv.mkDerivation {
 name = "java-debug-repo";
src = fetchFromGitHub {
  owner = "microsoft";
  repo = "java-debug";
  rev = "e6655ead412ceed5afa37b3781ed84e0b8ba425a";
  sha256 = "1syrzp8syisnd8fkj3lis5rv83chzj4gwm63ygib41c428yyw20a";
};

 dontConfigure = true;
 buildInputs = [ maven graalvm11-ce ];
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
 outputHash = "0lgqka9qlf9v685xrmb85rgrvwpi0sfqsx2z4zalgkqcsfhz8gb1";
}
