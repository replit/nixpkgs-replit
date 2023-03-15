{ pkgs, ... }:
{
  name = "GoTools";
  version = "1.0";

  packages = with pkgs; [
    go
    gopls
  ];

  replit.runners.go-build = rec {
    name = "go build";
    language = "go";
    extensions = [".go"];
    
    start = "./main";
    compile = "${pkgs.go}/bin/go build -o ${start}";
    fileParam = false;
  };

  replit.runners.go-run = {
    name = "go run";
    language = "go";
    extensions = [".go"];

    start = "${pkgs.go}/bin/go run .";
    fileParam = false;
  };

  replit.formatters.go-fmt = {
    name = "go fmt";
    language = "go";

    start = "${pkgs.go}/bin/go fmt";
    stdin = false;
  };

  replit.languageServers.gopls = {
    name = "gopls";
    language = "go";
    extensions = [".go"];
    
    start = "${pkgs.gopls}/bin/gopls";
  };
}
