{ stdenv
, maven
, fetchFromGitHub
, graalvm11-ce
}:
stdenv.mkDerivation {
 name = "java-debug-repo";
  src = fetchFromGitHub {
    owner = "replit";
    repo = "java-debug";
    rev = "2a556e52ce2aeb4857baf594829f5c57caf2e431";
    sha256 = "14ada9chynzycnfqc4w9c1w24gyx37by81fyb9y42izdrn46dj2z";
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
 outputHash = "sha256-myCgCPxkoIPAF9BAEad0rOW/KKe+spJi6Kf1CYZ5h0E=";
}
