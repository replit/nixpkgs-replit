{ pkgs, ... }:

let

  typescript-language-server = pkgs.nodePackages.typescript-language-server.override {
    nativeBuildInputs = [ pkgs.makeWrapper ];
    postInstall = ''
      wrapProgram "$out/bin/typescript-language-server" \
        --suffix PATH : ${pkgs.lib.makeBinPath [ pkgs.nodePackages.typescript ]} \
        --add-flags "--tsserver-path ${pkgs.nodePackages.typescript}/lib/node_modules/typescript/lib/"
    '';
  };

  nodejs = pkgs.nodejs;

  prybar = pkgs.replitPackages.prybar-nodejs;

  dap-node = pkgs.callPackage ../pkgs/dapNode { };

  run-prybar = pkgs.writeShellScriptBin "run-prybar" ''
    ${prybar}/bin/prybar-nodejs -q --ps1 "''$(printf '\u0001\u001b[33m\u0002\u0001\u001b[00m\u0002 ')" -i ''$1
  '';

in

{
  name = "Node.js Tools";
  version = "1.0";

  packages = [
    nodejs
  ];

  replit = {

    runners.nodeJS = {
      name = "Node.js";
      language = "javascript";
      start = "${nodejs}/bin/node $file";
      fileParam = true;
    };

    runners.nodeJS-prybar = {
      name = "Prybar for Node.js";
      language = "javascript";
      start = "${run-prybar}/bin/run-prybar $file";
      interpreter = true;
      fileParam = true;
    };

    debuggers.nodeDAP = {
      name = "Node DAP";
      language = "javascript";
      transport = "localhost:0";
      fileParam = true;
      start = "${dap-node}/bin/dap-node";
      initializeMessage = {
        command = "initialize";
        type = "request";
        arguments = {
          clientID = "replit";
          clientName = "replit.com";
          adapterID = "dap-node";
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
          args = [ ];
          console = "externalTerminal";
          cwd = ".";
          environment = [ ];
          pauseForSourceMap = false;
          program = "./$file";
          request = "launch";
          sourceMaps = true;
          stopOnEntry = false;
          type = "pwa-node";
        };
      };
    };

    languageServers.ts-language-server = import ../pkgs/typescript-language-server {
      inherit pkgs;
    };

    packagers.upmNodejs = {
      name = "UPM for Node.js";
      language = "nodejs";
      features = {
        packageSearch = true;
        guessImports = true;
        enabledForHosting = false;
      };
    };

  };

}
