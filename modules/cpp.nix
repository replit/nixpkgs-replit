{ pkgs, ... }:
let
  clang = pkgs.clang_14;
  clang-compile = import ../pkgs/clang-compile {
    inherit pkgs;
    inherit clang;
  };
  dap-cpp = pkgs.callPackage ../pkgs/dap-cpp { };
  dap-cpp-messages = import ../pkgs/dap-cpp/messages.nix;
in
{
  name = "C++ Tools";
  version = "1.0";

  packages = [
    clang
  ];

  replit.runners.clang-project = {
    name = "Clang++: Project";
    compile = "${clang-compile}/bin/clang-compile main.cpp cpp all";
    fileParam = false;
    language = "cpp";
    start = "./main.cpp.bin";
  };

  # TODO: add single runners/debuggers when we have priority for runners

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
    compile = "${clang-compile}/bin/clang-compile main.cpp cpp all debug";
    transport = "stdio";
    initializeMessage = dap-cpp-messages.dapInitializeMessage;
    launchMessage = dap-cpp-messages.dapLaunchMessage "./main.cpp.bin";
  };
}
