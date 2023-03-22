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

in

{
  name = "nodejs";
  version = "1.2";

  packages = [
    pkgs.nodejs-14_x
    typescript-language-server
  ];

  replit = {

    initializers.npmInit = {
      name = "npm init";
      start = "npm init -y";
      runOnce = true;
    };

    runners.nodeJS = {
      name = "Node.js";
      language = "javascript";
      extensions = [ ".js" ".ts" ".jsx" ".tsx" ];
      start = "${pkgs.nodejs-14_x}/bin/node $file";
      compile = {
        args = [ "tsc" "$file" ];
        env = {
          FOO = "BAR";
        };
      };
      fileParam = true;
      productionOverride = {
        # only the options below
        start = "pm2 start server.js";
        compile = "yarn build";
        fileParam = false;
      };
    };

    debuggers.nodeDAP = {
      name = "Node DAP";
      language = "javascript";
      filePattern = "*.{js,jsx,ts,tsx}";
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
          program = "$file";
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
      extensions = [ ".js" ".ts" ".jsx" ".tsx" ];
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

    env = {
      FOO = "BAR";
    };

  };

}
