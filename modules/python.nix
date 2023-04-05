{ pkgs, ... }:
let
  pip = pkgs.callPackage ../pkgs/pip { };

  poetry = pkgs.callPackage ../pkgs/poetry { };

  python = pkgs.python310Full;

  stderred = pkgs.replitPackages.stderred;

  prybar = pkgs.replitPackages.prybar-python310;

  pypkgs = pkgs.python310Packages;

  debugpy = pypkgs.debugpy;

  dapPython = pkgs.replitPackages.dapPython;

  python-lsp-server = pkgs.callPackage ../pkgs/python-lsp-server { };

  python-ld-library-path = pkgs.lib.makeLibraryPath [
    # Needed for pandas / numpy
    pkgs.stdenv.cc.cc.lib
    pkgs.zlib
    # Needed for pygame
    pkgs.glib
    # Needed for matplotlib
    pkgs.xorg.libX11
  ];

  python3-wrapper = pkgs.stdenvNoCC.mkDerivation {
    name = "python3-wrapper";
    buildInputs = [ pkgs.makeWrapper ];

    buildCommand = ''
      mkdir -p $out/bin
      makeWrapper ${python}/bin/python3 $out/bin/python3 \
        --set LD_LIBRARY_PATH "${python-ld-library-path}"
    
      ln -s $out/bin/python3 $out/bin/python
      ln -s $out/bin/python3 $out/bin/python3.10
    '';
  };

  run-prybar = pkgs.writeShellScriptBin "run-prybar" ''
    export LD_LIBRARY_PATH="${python-ld-library-path}"
    ${stderred}/bin/stderred -- ${prybar}/bin/prybar-python310 -q --ps1 "''$(printf '\u0001\u001b[33m\u0002\u0001\u001b[00m\u0002 ')" -i ''$1
  '';

in
{
  name = "Python Tools";
  version = "1.0";

  packages = [
    python3-wrapper
    pip
    poetry
    run-prybar
    python-lsp-server
  ];

  replit.runners.python = {
    name = "Python 3.10";
    fileParam = true;
    language = "python3";
    start = "${python3-wrapper}/bin/python3 $file";
  };

  replit.runners.python-prybar = {
    name = "Prybar for Python 3.10";
    fileParam = true;
    language = "python3";
    start = "${run-prybar}/bin/run-prybar $file";
    interpreter = true;
  };

  replit.debuggers.dapPython = {
    name = "DAP Python";
    language = "python3";
    start = "${dapPython}/bin/dap-python $file";
    fileParam = true;
    transport = "localhost:0";
    integratedAdapter = {
      dapTcpAddress = "localhost:0";
    };
    initializeMessage = {
      command = "initialize";
      type = "request";
      arguments = {
        adapterID = "debugpy";
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
      command = "attach";
      type = "request";
      arguments = {
        logging = { };
      };
    };
  };

  replit.languageServers.python-lsp-server = {
    name = "python-lsp-server";
    language = "python3";
    start = "${python-lsp-server}/bin/pylsp";
  };

  replit.packagers.upmPython = {
    name = "Python";
    language = "python3";
    ignoredPackages = [ "unit_tests" ];
    features = {
      packageSearch = true;
      guessImports = true;
      enabledForHosting = false;
    };
  };

  replit.env =
    let userbase = "$HOME/$REPL_SLUG/.pythonlibs";
    in {
      PYTHONPATH = "${userbase}/${python.sitePackages}";
      PIP_USER = "1";
      POETRY_VIRTUALENVS_CREATE = "0";
      PYTHONUSERBASE = userbase;
    };
}
