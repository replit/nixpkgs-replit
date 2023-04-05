{ config, pkgs, ... }:

let

  typescript-language-server = pkgs.nodePackages.typescript-language-server.override {
    nativeBuildInputs = [ pkgs.makeWrapper ];
    postInstall = ''
      wrapProgram "$out/bin/typescript-language-server" \
        --suffix PATH : ${pkgs.lib.makeBinPath [ pkgs.nodePackages.typescript ]} \
        --add-flags "--tsserver-path ${pkgs.nodePackages.typescript}/lib/node_modules/typescript/lib/"
    '';
  };

  stderr-prybar = pkgs.writeShellScriptBin "stderr-prybar" ''
    ${stderred}/bin/stderred -- ${prybar}/bin/prybar-python310 -q --ps1 "''$(printf '\u0001\u001b[33m\u0002\u0001\u001b[00m\u0002 ')" -i ''$1
  '';

  run-prybar = pkgs.stdenvNoCC.mkDerivation {
    name = "run-prybar";
    buildInputs = [ pkgs.makeWrapper ];

    buildCommand = ''
      mkdir -p $out/bin

      makeWrapper ${stderr-prybar}/bin/stderr-prybar $out/bin/run-prybar \
        --set LD_LIBRARY_PATH "${python-ld-library-path}"
    '';
  };

in

{
  name = "nodejs";
  version = "1.2";

  packages = [
    pkgs.nodejs-14_x
    typescript-language-server
  ];

  replit = {

    runners.nodeJS = {
      name = "Node.js";
      language = "javascript";
      start = "${pkgs.nodejs-14_x}/bin/node $file";
      fileParam = true;
    };

    runners.nodeJS-prybar = {
      name = "Prybar for Node.js";
      language = "javascript";
      start = "${pkgs.replitPackages.prybar-nodejs}/bin/prybar-nodejs -q --ps1 \"\$(printf '\\u0001\\u001b[33m\\u0002\\u0001\\u001b[00m\\u0002 ')\" -i";
      fileParam = true;
    };

    debuggers.nodeDAP = {
      name = "Node DAP";
      language = "javascript";
      transport = "localhost:0";
      fileParam = true;
      start = "dap-node";
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

    languageServers.tsServer = {
      name = "TypeScript Language Server";
      language = "javascript";
      start = "${typescript-language-server}/bin/typescript-language-server --stdio";
    };

    packagers.upmNodejs = {
      name = "UPM for Node.js";
      language = "nodejs";
      features = {
        packageSearch = true;
        guessImports = true;
        enabledForHosting = false;
      };
      afterInstall = {
        args = [ "echo" "installed" ];
      };
    };

  };

}