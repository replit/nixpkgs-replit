{ pkgs, ... }:

let
  bun = pkgs.replitPackages.bun;

  extensions = [ ".js" ".ts" ];
in

{
  name = "Bun Tools";
  version = "1.0";

  imports = [ ./typescript-language-server.nix ];

  packages = [
    bun
  ];

  replit.languageServers.typescript-language-server.extensions = extensions;

  replit.runners.bun = {
    name = "bun";
    language = "javascript";
    inherit extensions;

    start = "${bun}/bin/bun run $file";
    fileParam = true;
  };

  replit.packagers.bun = {
    name = "bun";
    language = "bun";
    features = {
      packageSearch = true;
      guessImports = true;
      enabledForHosting = false;
    };
  };
}
