{ stdenv
, maven
, fetchFromGitHub
}:
stdenv.mkDerivation {
 name = "java-language-server-repo";
 src = fetchFromGitHub {
   owner = "georgewfraser";
   repo = "java-language-server";
   rev = "7fffb6c5929fe02c52e1c823ae990bad2b540ad1";
   sha256 = "0vw3sn2pm95aqs0wjgvzdnrmaz79f5gv212l3xq58c30n8i1lj1m";
 };

 dontConfigure = true;
 buildInputs = [ maven ];
 buildPhase = ''
   mvn package -Dmaven.repo.local=$out -DskipTests
 '';

 # keep only *.{pom,jar,sha1,nbm} and delete all ephemeral files with lastModified timestamps inside
 installPhase = ''
   find $out -type f \
     -name \*.lastUpdated -or \
     -name resolver-status.properties -or \
     -name _remote.repositories \
     -delete
 '';

 # don't do any fixup
 dontFixup = true;
 outputHashAlgo = "sha256";
 outputHashMode = "recursive";
 outputHash = "0850nyrsmgcfxqcrr8rs48pbi1qsx9gwv57cxq3y38dwd4m10iv2";
}
