{ pkgs, ... }: 

assert pkgs.clojure.version == "1.11.1.1200";

{
  name = "Clojure Tools";
  version = "1.0";

  replit.runners.clojure = {
    name = "Clojure";
    language = "clojure";

    start = "${pkgs.clojure}/bin/clojure -M $file";
    fileParam = true;
  };

  replit.languageServers.clojure-lsp = {
    name = "Clojure LSP";
    language = "clojure";

    start = "${pkgs.clojure-lsp}/bin/clojure-lsp";
  };
}
