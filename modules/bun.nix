{ pkgs, ... }:

let
  bun = pkgs.replitPackages.bun;

  extensions = [ ".js" ".ts" ];
in

{
  name = "Bun Tools";
  version = "1.0";

  packages = [
    bun
  ];

  replit.runners.bun = {
    name = "bun";
    language = "bun";
    inherit extensions;

    start = "${bun}/bin/bun run $file";
    fileParam = true;
  };

  replit.languageServers.ts-language-server = import ../pkgs/typescript-language-server {
    inherit pkgs;
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
