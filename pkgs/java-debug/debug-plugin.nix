{ stdenv
, maven
, fetchFromGitHub
, graalvm11-ce
, callPackage
}:
let
  repository = callPackage ./repo.nix { };

  version = "0.32.0";

in stdenv.mkDerivation {
  inherit version;
  name = "java-debug-plugin";

  src = fetchFromGitHub {
    owner = "replit";
    repo = "java-debug";
    rev = "2a556e52ce2aeb4857baf594829f5c57caf2e431";
    sha256 = "14ada9chynzycnfqc4w9c1w24gyx37by81fyb9y42izdrn46dj2z";
  };

  buildInputs = [ maven graalvm11-ce ];
  buildPhase = ''
    # Maven tries to grab lockfiles in the repository, so it has to be writeable
    cp -a ${repository} ./repository
    chmod u+w -R ./repository
    ${maven}/bin/mvn --offline -Dmaven.repo.local=./repository package
  '';

  installPhase = ''
    mkdir -p $out/lib
    cp com.microsoft.java.debug.plugin/target/com.microsoft.java.debug.plugin-${version}.jar $out/lib/java-debug.jar
  '';
}
