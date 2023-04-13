{ pkgs, ... }:
let clang = pkgs.clang_12;
compile = pkgs.writeShellScriptBin "compile" ''
  CFLAGS="$CFLAGS -g -Wno-everything -pthread -lm"
  SRCS=$(find . -name '.ccls-cache' -type d -prune -o -type f -name '*.c' -print)
  HEADERS=$(find . -name '.ccls-cache' -type d -prune -o -type f -name '*.h' -print)
  FILE="$1"
  DEBUG="$2"
  if [[ "$DEBUG" == "debug" ]]; then
    CFLAGS="$CFLAGS -O0"
  fi
  ${clang}/bin/clang $CFLAGS $SRCS -o "''$FILE.bin"
'';
dap-cpp = pkgs.callPackage ../pkgs/dap-cpp { };
in
{
  name = "C Tools";
  version = "1.0";

  packages = [
    clang
  ];

  replit.runners.clang = {
    name = "Clang Compiler";
    compile = "${compile}/bin/compile $file";
    fileParam = true;
    language = "c";
    start = "./\${file}.bin";
  };

  replit.languageServers.ccls = {
    name = "ccls";
    language = "c";
    start = "${pkgs.ccls}/bin/ccls";
  };

  replit.debuggers.dap-cpp = {
    name = "VSCode DAP for C";
    language = "c";
    start = "${dap-cpp}/bin/dap-cpp";
    fileParam = true;
    compile = "${compile}/bin/compile $file debug";
    transport = "stdio";
    initializeMessage = {
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
    launchMessage = {
      command = "launch";
      type = "request";
      arguments = {
        MIMode = "gdb";
        arg = [];
        cwd = ".";
        environment = [];
        externalConsole = false;
        logging = {};
        miDebuggerPath = "gdb";
        name = "g++ - Build and debug active file";
        program = "./$file.bin";
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
  };
}