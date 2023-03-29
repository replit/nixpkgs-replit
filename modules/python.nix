{ pkgs, ... }:
let pip = pkgs.replitPackages.pip;

poetry = pkgs.replitPackages.poetry;

python = pkgs.python310Full;

stderred = pkgs.replitPackages.stderred;

prybar = pkgs.replitPackages.prybar-python310;

pypkg = pkgs.python310Packages;

debugpy = pypkg.debugpy;

dapPython = pkgs.replitPackages.dapPython;

python-lsp-server = pkgs.replitPackages.python-lsp-server;

replit-py = pkgs.replitPackages.replit-py;

pyLibPath = (pypkg: "${pypkg.outPath}/${python.sitePackages}");

getPythonPaths = (pkglist: pkgs.lib.lists.foldr (
  pkg: list: (list ++ [(pyLibPath pkg)] ++ (getPythonPaths 
    (builtins.filter (i: i != null) pkg.propagatedBuildInputs)
  ))
) [] pkglist);

makePythonPath = (pkglist: pkgs.lib.strings.concatStringsSep ":" (
  pkgs.lib.lists.unique (getPythonPaths pkglist)
));

python-ld-library-path = pkgs.lib.makeLibraryPath [
  # Needed for pandas / numpy
  pkgs.stdenv.cc.cc.lib
  pkgs.zlib
  # Needed for pygame
  pkgs.glib
  # Needed for matplotlib
  pkgs.xorg.libX11
];

python3-wrapper = pkgs.stdenv.mkDerivation {
  name = "python3-wrapper";
  buildInputs = [pkgs.makeWrapper];
  src = ./.;

  installPhase = ''
    mkdir -p $out/bin
    makeWrapper ${python}/bin/python3 $out/bin/python3 \
      --set LD_LIBRARY_PATH "${python-ld-library-path}"
  '';
};

prybar-wrapper = pkgs.stdenv.mkDerivation {
  name = "prybar-python310-wrapper";
  buildInputs = [pkgs.makeWrapper];
  src = ./.;

  installPhase = ''
    mkdir -p $out/bin
    makeWrapper ${prybar}/bin/prybar-python310 $out/bin/prybar-python310 \
      --set LD_LIBRARY_PATH "${python-ld-library-path}"
  '';
};

in {
  name = "Python Tools";
  version = "1.0";

  packages = [
    python3-wrapper
    pip
    poetry
    prybar
    python-lsp-server
  ];

  replit.runners.python = {
    name = "Python";
    fileParam = true;
    language = "python3";
    start = "${python3-wrapper}/bin/python3 $file";
  };

  replit.runners.python-prybar = {
    name = "Prybar for Python 3.10";
    fileParam = true;
    language = "python3";
    start = "${stderred}/bin/stderred -- ${prybar-wrapper}/bin/prybar-python310 -q --ps1 \$(printf \"\u0001\u001b[33m\u0002\u0001\u001b[00m\u0002\") -i $file";
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
        logging = {};
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
    ignoredPackages = ["unit_tests"];
    features = {
      packageSearch = true;
      guessImports = true;
      enabledForHosting = false;
    };
  };

  replit.env = {
    PYTHONPATH = "${python}/${python.sitePackages}:$HOME/$REPL_SLUG/.pythonlibs/${python.sitePackages}:${makePythonPath [pip poetry debugpy python-lsp-server replit-py]}";
    PIP_USER = "true";
    PYTHONUSERBASE = "$HOME/$REPL_SLUG/.pythonlibs";
  };
}