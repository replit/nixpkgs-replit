{ pkgs, ... }:

let
  bun = pkgs.replitPackages.bun;

  extensions = [ ".js" ".ts" ];
in

assert bun.version == "0.5.9";

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

  replit.languageServers.ts-language-server = {
    name = "TypeScript Language Server";
    language = "bun";
    inherit extensions;

    start = "${pkgs.nodePackages.typescript-language-server}/bin/typescript-language-server --stdio";
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
