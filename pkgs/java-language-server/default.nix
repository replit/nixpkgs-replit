{ stdenv
, maven
, callPackage
, fetchFromGitHub
, graalvm17-ce
, jdk
, poetry2nix
}:
let
  repository = callPackage ./repo.nix { };

  jars = [
    "$PWD/dist/classpath/gson-2.8.5.jar"
    "$PWD/dist/classpath/protobuf-java-3.9.1.jar"
    "$PWD/dist/classpath/java-language-server.jar"
  ];

  flags = [
    "--add-exports=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED"
    "--add-exports=jdk.compiler/com.sun.tools.javac.code=ALL-UNNAMED"
    "--add-exports=jdk.compiler/com.sun.tools.javac.comp=ALL-UNNAMED"
    "--add-exports=jdk.compiler/com.sun.tools.javac.main=ALL-UNNAMED"
    "--add-exports=jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED"
    "--add-exports=jdk.compiler/com.sun.tools.javac.model=ALL-UNNAMED"
    "--add-exports=jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED"
    "--add-opens=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED"
    "--class-path ${builtins.concatStringsSep ":" jars}"
    "--no-fallback"
  ];

  codegen = poetry2nix.mkPoetryApplication {
    projectDir = ./codegen;
  };

in stdenv.mkDerivation rec {
  name = "java-language-server";
  version = "0.2.38";

  src = fetchFromGitHub {
    owner = "georgewfraser";
    repo = "java-language-server";
    rev = "7fffb6c5929fe02c52e1c823ae990bad2b540ad1";
    sha256 = "0vw3sn2pm95aqs0wjgvzdnrmaz79f5gv212l3xq58c30n8i1lj1m";
  };

  nativeBuildInputs = [ maven graalvm17-ce codegen ];
  buildInputs = [ jdk ];
  patches = [ ./patches/log-cycle.patch ./patches/static-gson.patch ];
  dontConfigure = true;
  buildPhase = ''
    echo "Generating static type adapters for LSP"
    codegen $PWD/src/main/java/org/javacs/lsp

    echo "Using repository ${repository}"
    mvn --offline -Dmaven.repo.local=${repository} -DskipTests package;

    native-image ${builtins.concatStringsSep " " flags} org.javacs.Main
    native-image ${builtins.concatStringsSep " " flags} org.javacs.debug.JavaDebugServer
  '';
  installPhase = ''
    mkdir -p $out/share/java
    cp -a dist/classpath/* $out/share/java

    mkdir -p $out/bin
    cp org.javacs.main $out/bin/java-language-server
    cp org.javacs.debug.javadebugserver $out/bin/java-dap
  '';
}
