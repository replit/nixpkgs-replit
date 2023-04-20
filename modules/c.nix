{ pkgs, ... }:
let
  clang = pkgs.clang_14;
  run-extensions = [ ".c" ]; # use this list for file-param runners because
  # we don't want .h files to be runnable
  clang-compile = import ../pkgs/clang-compile {
    inherit pkgs;
    inherit clang;
  };
  dap-cpp = pkgs.callPackage ../pkgs/dap-cpp { };
  dap-cpp-messages = import ../pkgs/dap-cpp/messages.nix;
in

assert clang.version == "14.0.6";

{
  name = "C Tools";
  version = "14.0";

  packages = [
    clang
  ];

  replit.runners.clang-project = {
    name = "Clang: Project";
    compile = "${clang-compile}/bin/clang-compile main.c c all";
    fileParam = false;
    language = "c";
    start = "./main.c.bin";
  };

  # TODO: add back single runners/debuggers when we have priority for runners
  # we want to avoid an unstable first runner for users
  # that do not have multiple runners turned on

  # replit.runners.clang-single = {
  #   name = "Clang: Single File";
  #   compile = "${clang-compile}/bin/clang-compile $file c single";
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
    compile = "${clang-compile}/bin/clang-compile main.c c all debug";
    transport = "stdio";
    initializeMessage = dap-cpp-messages.dapInitializeMessage;
    launchMessage = dap-cpp-messages.dapLaunchMessage "./main.c.bin";
  };

  # replit.debuggers.gdb-single = {
  #   name = "GDB: Single File";
  #   language = "c";
  #   extensions = run-extensions;
  #   start = "${dap-cpp}/bin/dap-cpp";
  #   fileParam = true;
  #   compile = "${clang-compile}/bin/clang-compile $file c single debug";
  #   transport = "stdio";
  #   initializeMessage = dapInitializeMessage;
  #   launchMessage = dapLaunchMessage "./$file.bin";
  # };
}
