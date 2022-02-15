{ stdenv
, maven
, fetchFromGitHub
, graalvm11-ce
, callPackage
}:
let
  repository = callPackage ./repo.nix { };

  version = "0.35.0";

in stdenv.mkDerivation {
  inherit version;
  name = "java-debug-plugin";

  src = fetchFromGitHub {
    owner = "microsoft";
    repo = "java-debug";
    rev = "e6655ead412ceed5afa37b3781ed84e0b8ba425a";
    sha256 = "1syrzp8syisnd8fkj3lis5rv83chzj4gwm63ygib41c428yyw20a";
  };

  patches = [ ./bind-address.patch ];
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
