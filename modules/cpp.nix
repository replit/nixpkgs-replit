{ pkgs, ... }:
let
  clang = pkgs.clang_14;
  run-extensions = [ ".cpp" ".cc" ".cxx" ]; # use this for file param runners/debuggers
  # because we don't want header files to be
  # runnable
  compile = pkgs.writeShellScriptBin "compile" ''
    CFLAGS="$CFLAGS -g -Wno-everything -pthread -lm"
    FILE="$1"     # a .cpp file
    MODE="$2"     # mode can be:
                  #   single - compile just one .cpp file, or
                  #   all - compile all .cpp files
    DEBUG="$3"    # debug can be:
                  #   debug - compile with no optimization
                  #   (empty) - compile regularly

    if [[ ! -f "$FILE" ]]; then
      echo "$FILE not found"
      exit 1
    fi

    if [[ "$MODE" == "all" ]]; then
      SRCS=$(find . -name '.ccls-cache' -type d -prune -o -type f -name '*.cpp' -print)
    else
      SRCS="$FILE"
    fi
  
    if [[ "$DEBUG" == "debug" ]]; then
      CFLAGS="$CFLAGS -O0"
    fi

    rm -f ''$FILE.bin

    set -o xtrace
    ${clang}/bin/clang++ $CFLAGS $SRCS -o "''$FILE.bin"
  '';
  dap-cpp = pkgs.callPackage ../pkgs/dap-cpp { };
  dapInitializeMessage = {
    command = "initialize";
    type = "request";
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
  dapLaunchMessage = program: {
    command = "launch";
    type = "request";
    arguments = {
      MIMode = "gdb";
      arg = [ ];
      cwd = ".";
      environment = [ ];
      externalConsole = false;
      logging = { };
      miDebuggerPath = "gdb";
      name = "g++ - Build and debug active file";
      inherit program;
      request = "launch";
      setupCommands = [
        {
          description = "Enable pretty-printing for gdb";
          ignoreFailures = true;
          text = "-enable-pretty-printing";
        }
      ];
      stopAtEntry = false;
      type = "cppdbg";
    };
  };
in
{
  name = "C++ Tools";
  version = "1.0";

  packages = [
    clang
  ];

  replit.runners.clang-project = {
    name = "Clang++: Project";
    compile = "${compile}/bin/compile main.cpp all";
    fileParam = false;
    language = "cpp";
    start = "./main.cpp.bin";
  };

  replit.runners.clang-single = {
    name = "Clang++: Single File";
    compile = "${compile}/bin/compile $file single";
    fileParam = true;
    language = "cpp";
    extensions = run-extensions;
    start = "./\${file}.bin";
  };

  replit.languageServers.ccls = {
    name = "ccls";
    language = "cpp";
    start = "${pkgs.ccls}/bin/ccls";
  };

  replit.debuggers.gdb-project = {
    name = "GDB C++: Project";
    language = "cpp";
    start = "${dap-cpp}/bin/dap-cpp";
    fileParam = false;
    compile = "${compile}/bin/compile main.cpp all debug";
    transport = "stdio";
    initializeMessage = dapInitializeMessage;
    launchMessage = dapLaunchMessage "./main.cpp.bin";
  };

  replit.debuggers.gdb-single = {
    name = "GDB C++: Single";
    language = "cpp";
    start = "${dap-cpp}/bin/dap-cpp";
    fileParam = true;
    extensions = run-extensions;
    compile = "${compile}/bin/compile $file single debug";
    transport = "stdio";
    initializeMessage = dapInitializeMessage;
    launchMessage = dapLaunchMessage "./$file.bin";
  };
}
