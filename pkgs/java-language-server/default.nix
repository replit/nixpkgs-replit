{ stdenv
, maven
, callPackage
, fetchFromGitHub
, graalvm17-ce
, poetry2nix
, makeWrapper
}:
let
  repository = callPackage ./repo.nix { };

  jars = [
    "$classpath/gson-2.8.5.jar"
    "$classpath/protobuf-java-3.9.1.jar"
    "$classpath/java-language-server.jar"
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

  nativeBuildInputs = [ maven graalvm17-ce codegen makeWrapper ];
  buildInputs = [ graalvm17-ce ];
  patches = [ ./patches/log-cycle.patch ./patches/static-gson.patch ];
  dontConfigure = true;
  buildPhase = ''
    echo "Generating static type adapters for LSP"
    codegen src/main/java/org/javacs/lsp

    echo "Using repository ${repository}"
    mvn --offline -Dmaven.repo.local=${repository} -DskipTests package;

    classpath=dist/classpath
    native-image ${builtins.concatStringsSep " " flags} --no-fallback org.javacs.Main
    native-image ${builtins.concatStringsSep " " flags} --no-fallback org.javacs.debug.JavaDebugServer
  '';
  installPhase = ''
    classpath=$out/share/java
    mkdir -p $classpath
    cp -a dist/classpath/* $classpath

    mkdir -p $out/bin
    cp org.javacs.main $out/bin/native-java-language-server
    cp org.javacs.debug.javadebugserver $out/bin/native-java-dap

    makeWrapper ${graalvm17-ce}/bin/java $out/bin/java-langauge-server \
      --add-flags "${builtins.concatStringsSep " " flags}" \
      --add-flags "org.javacs.Main"

    makeWrapper ${graalvm17-ce}/bin/java $out/bin/java-dap \
      --add-flags "${builtins.concatStringsSep " " flags}" \
      --add-flags "org.javacs.debug.JavaDebugServer"
  '';
}
