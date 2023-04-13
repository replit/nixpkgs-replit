{ pkgs, ... }:
let
  clang = pkgs.clang_14;
  run-extensions = [ ".c" ]; # use this list for file-param runners because
  # we don't want .h files to be runnable
  compile = pkgs.writeShellScriptBin "compile" ''
    CFLAGS="$CFLAGS -g -Wno-everything -pthread -lm"
    FILE="$1"     # a .c file
    MODE="$2"     # mode can be:
                  #   single - compile just one .c file, or
                  #   all - compile all .c files
    DEBUG="$3"    # debug can be:
                  #   debug - compile with no optimization
                  #   (empty) - compile regularly

    if [[ ! -f "$FILE" ]]; then
      echo "$FILE not found"
      exit 1
    fi

    if [[ "$MODE" == "all" ]]; then
      SRCS=$(find . -name '.ccls-cache' -type d -prune -o -type f -name '*.c' -print)
    else
      SRCS="$FILE"
    fi
  
    if [[ "$DEBUG" == "debug" ]]; then
      CFLAGS="$CFLAGS -O0"
    fi

    rm -f ''$FILE.bin

    set -o xtrace
    ${clang}/bin/clang $CFLAGS $SRCS -o "''$FILE.bin"
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
      name = "gcc - Build and debug active file";
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
  name = "C Tools";
  version = "1.0";

  packages = [
    clang
  ];

  replit.runners.clang-project = {
    name = "Clang: Project";
    compile = "${compile}/bin/compile main.c all";
    fileParam = false;
    language = "c";
    start = "./main.c.bin";
  };

  # TODO: add back single runners/debuggers when we have priority for runners
  # we want to avoid an unstable first runner for users
  # that do not have multiple runners turned on

  # replit.runners.clang-single = {
  #   name = "Clang: Single File";
  #   compile = "${compile}/bin/compile $file single";
  #   fileParam = true;
  #   language = "c";
  #   extensions = run-extensions;
  #   start = "./\${file}.bin";
  # };

  replit.languageServers.ccls = {
    name = "ccls";
    language = "c";
    start = "${pkgs.ccls}/bin/ccls";
  };

  replit.debuggers.gdb-project = {
    name = "GDB: Project";
    language = "c";
    start = "${dap-cpp}/bin/dap-cpp";
    fileParam = false;
    compile = "${compile}/bin/compile main.c all debug";
    transport = "stdio";
    initializeMessage = dapInitializeMessage;
    launchMessage = dapLaunchMessage "./main.c.bin";
  };

  # replit.debuggers.gdb-single = {
  #   name = "GDB: Single File";
  #   language = "c";
  #   extensions = run-extensions;
  #   start = "${dap-cpp}/bin/dap-cpp";
  #   fileParam = true;
  #   compile = "${compile}/bin/compile $file single debug";
  #   transport = "stdio";
  #   initializeMessage = dapInitializeMessage;
  #   launchMessage = dapLaunchMessage "./$file.bin";
  # };
}
