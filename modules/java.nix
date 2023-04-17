{ pkgs, ... }:

let
	graalvm = pkgs.graalvm17-ce;

  graal-compile-command = "${pkgs.graalvm17-ce}/bin/javac -classpath .:target/dependency/* -d . $(find . -type f -name '*.java')";
in

{
  name = "Java Tools";
  version = "1.0";

  packages = [
		graalvm
    pkgs.maven
  ];

  replit.runners.graal = {
    name = "GraalVM 17";
    language = "java";

    compile = graal-compile-command;
    start = "${graalvm}/bin/java -classpath .:target/dependency/* Main";
  };

  replit.packagers.maven = {
    name = "Maven";
    language = "java-maven";
    features = {
      enabledForHosting = false;
      packageSearch = true;
      guessImports = false;
    };
  };

  replit.debuggers.java-debug = {
    name = "Jave Debug";
    language = "java";
    extensions = [".java"];

    transport = "localhost:0";
    compile = graal-compile-command;
    start = "${pkgs.replitPackages.java-debug}/bin/java-debug";

    initializeMessage = {
      command = "initialize";
      arguments = {
        adapterID = "cppdbg";
        clientID = "replit";
        clientName = "replit.com";
        columnsStartAt1 = true;
        linesStartAt1 = true;
        locale = "en-us";
        pathFormat = "path";
        supportsInvalidatedEvent = true;
        supportsProgressReporting = true;
        supportsRunInTerminalRequest = true;
        supportsVariablePaging = true;
        supportsVariableType = true;
      };
    };

    launchMessage = {
      command = "launch";
      arguments = {
        classPaths = ["."];
        mainClass = "Main";
      };
    };
  };

  replit.languageServers.jdt = {
    name = "JDT Language Server";
    language = "java";

    start = "${pkgs.replitPackages.jdt-language-server}/bin/jdt-language-server";
  };
}
