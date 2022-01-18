{ lib, stdenv, fetchFromGitHub
, graalvm17-ce, maven
, runtimeShell, makeWrapper
}:

let
  platform =
    if stdenv.isLinux then "linux"
    else if stdenv.isDarwin then "mac"
    else if stdenv.isWindows then "windows"
    else throw "unsupported platform";
in
stdenv.mkDerivation rec {
  pname = "java-language-server";
  version = "0.2.38";

  src = fetchFromGitHub {
    owner = "georgewfraser";
    repo = pname;
    # commit hash is used as owner sometimes forgets to set tags. See https://github.com/georgewfraser/java-language-server/issues/104
    rev = "1dfdc54d1f1e57646a0ec9c0b3f4a4f094bd9f17";
    sha256 = "sha256-zkbl/SLg09XK2ZhJNzWEtvFCQBRQ62273M/2+4HV1Lk=";
  };

  fetchedMavenDeps = stdenv.mkDerivation {
    name = "java-language-server-${version}-maven-deps";
    inherit src;
    buildInputs = [ maven ];

    buildPhase = ''
      runHook preBuild
      mvn package -Dmaven.repo.local=$out -DskipTests
      runHook postBuild
    '';

    installPhase = ''
      runHook preInstall
      find $out -type f \
        -name \*.lastUpdated -or \
        -name resolver-status.properties -or \
        -name _remote.repositories \
        -delete
      runHook postInstall
    '';

    dontFixup = true;
    dontConfigure = true;
    outputHashAlgo = "sha256";
    outputHashMode = "recursive";
    outputHash = "sha256-YkcQKmm8oeEH7uyUzV/qGoe4LiI6o5wZ7o69qrO3oCA=";
  };


  nativeBuildInputs = [ maven graalvm17-ce makeWrapper ];

  dontConfigure = true;
  buildPhase = ''
    runHook preBuild
    jlink \
      ${lib.optionalString (!stdenv.isDarwin) "--module-path './jdks/${platform}/jdk-13/jmods'"} \
      --add-modules java.base,java.compiler,java.logging,java.sql,java.xml,jdk.compiler,jdk.jdi,jdk.unsupported,jdk.zipfs \
      --output dist/${platform} \
      --no-header-files \
      --no-man-pages \
      --compress 2
    mvn package --offline -Dmaven.repo.local=${fetchedMavenDeps} -DskipTests
    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall
    # mkdir -p $out/share/java/java-language-server
    # cp -r dist/classpath dist/*${platform}* $out/share/java/java-language-server

    ${graalvm17-ce}/bin/native-image \
      --no-fallback \
      --allow-incomplete-classpath \
      -J-Xms256M \
      -J-Xmx2000M \
      -H:+ReportExceptionStackTraces \
      -H:ConfigurationFileDirectories=./dist/config-dir/ \
      --add-exports=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED \
      --add-exports=jdk.compiler/com.sun.tools.javac.code=ALL-UNNAMED \
      --add-exports=jdk.compiler/com.sun.tools.javac.comp=ALL-UNNAMED \
      --add-exports=jdk.compiler/com.sun.tools.javac.main=ALL-UNNAMED \
      --add-exports=jdk.compiler/com.sun.tools.javac.tree=ALL-UNNAMED \
      --add-exports=jdk.compiler/com.sun.tools.javac.model=ALL-UNNAMED \
      --add-exports=jdk.compiler/com.sun.tools.javac.util=ALL-UNNAMED \
      --add-opens=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED \
      -classpath ./dist/classpath/gson-2.8.5.jar:./dist/classpath/protobuf-java-3.9.1.jar:./dist/classpath/java-language-server.jar \
      org.javacs.Main
    ls -al
    mkdir -p $out/bin
    cp org.javacs.main $out/bin/ni-java-language-server

    # a link is not used as lang_server_${platform}.sh makes use of "dirname $0" to access other files
    # makeWrapper $out/share/java/java-language-server/lang_server_${platform}.sh $out/bin/java-language-server
    runHook postInstall
  '';

  meta = with lib; {
    description = "A Java language server based on v3.0 of the protocol and implemented using the Java compiler API";
    homepage = "https://github.com/georgewfraser/java-language-server";
    license = licenses.mit;
    maintainers = with maintainers; [ hqurve ];
    platforms = platforms.all;
  };
}
