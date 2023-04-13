{ pkgs, ... }: {
  name = "Haskell Tools";
  version = "1.0";

  packages = with pkgs; [
    ghc
  ];

  replit.runners.interpreted = {
    name = "GHC app";
    language = "haskell";

    start = "${pkgs.ghc}/bin/runghc $file";
    fileParam = true;
  };

  replit.languageServers.haskell-language-server = {
    name = "Haskell Language Server";
    language = "haskell";

    start = "${pkgs.haskell-language-server}/bin/haskell-language-server --lsp";
  };
}
