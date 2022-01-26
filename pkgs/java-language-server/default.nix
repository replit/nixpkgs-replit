{ stdenv, maven, callPackage, fetchFromGitHub, graalvm17-ce	 }:
# pick a repository derivation, here we will use buildMaven
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
	dontConfigure = true;

  buildPhase = ''
    echo "Using repository ${repository}"
    mvn --offline -Dmaven.repo.local=${repository} -DskipTests package;

    JLINK_VM_OPTIONS="\
    --add-exports jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED \
    --add-exports jdk.compiler/com.sun.tools.javac.code=ALL-UNNAMED \
    --add-exports jdk.compiler/com.sun.tools.javac.comp=ALL-UNNAMED \
    --add-exports jdk.compiler/com.sun.tools.javac.main=ALL-UNNAMED \
    --add-exports jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED \
    --add-exports jdk.compiler/com.sun.tools.javac.model=ALL-UNNAMED \
    --add-exports jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED \
    --add-opens jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED"
    DIR=`pwd`/dist
    CLASSPATH_OPTIONS="-classpath $DIR/classpath/gson-2.8.5.jar:$DIR/classpath/protobuf-java-3.9.1.jar:$DIR/classpath/java-language-server.jar"
    native-image $CLASSPATH_OPTIONS org.javacs.Main --no-fallback
  '';

  installPhase = ''
		mkdir -p $out/share/java
		cp -a dist/classpath/* $out/share/java

    mkdir -p $out/bin
    cp org.javacs.main $out/bin/java-language-server
  '';
}
