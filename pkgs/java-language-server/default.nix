{ stdenv
, maven
, callPackage
, fetchFromGitHub
, graalvm17-ce
}:
let repository = callPackage ./repo.nix { };
in stdenv.mkDerivation rec {
  name = "java-language-server";
  version = "0.0";

  src = fetchFromGitHub {
    owner = "georgewfraser";
    repo = "java-language-server";
    rev = "7fffb6c5929fe02c52e1c823ae990bad2b540ad1";
    sha256 = "0vw3sn2pm95aqs0wjgvzdnrmaz79f5gv212l3xq58c30n8i1lj1m";
  };

  buildInputs = [ maven graalvm17-ce ];
  patches = [ ./reflect.patch ];
  dontConfigure = true;
  buildPhase = ''
    echo "Using repository ${repository}"
    mvn --offline -Dmaven.repo.local=${repository} -DskipTests package;

    DIR=`pwd`/dist/classpath

    native-image \
    --add-exports=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED \
    --add-exports=jdk.compiler/com.sun.tools.javac.code=ALL-UNNAMED \
    --add-exports=jdk.compiler/com.sun.tools.javac.comp=ALL-UNNAMED \
    --add-exports=jdk.compiler/com.sun.tools.javac.main=ALL-UNNAMED \
    --add-exports=jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED \
    --add-exports=jdk.compiler/com.sun.tools.javac.model=ALL-UNNAMED \
    --add-exports=jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED \
    --add-opens=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED \
    --classpath $DIR/gson-2.8.5.jar:$DIR/protobuf-java-3.9.1.jar:$DIR/java-language-server.jar \
    --no-fallback \
    org.javacs.Main \
  '';
  installPhase = ''
    mkdir -p $out/share/java
    cp -a dist/classpath/* $out/share/java

    mkdir -p $out/bin
    cp org.javacs.main $out/bin/java-language-server
  '';
}
