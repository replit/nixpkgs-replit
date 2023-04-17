{ pkgs, ... }: {
  name =  "R Tools";
  version = "1.0";

  replit.runners.r = {
    name = "R";
    language = "r";

    start = "${pkgs.R}/bin/R -s -f $file";
    fileParam = true;
  };

  replit.packagers.r = {
    name = "R";
    language = "r";
    features = {
      packageSearch = true;
      guessImports = false;
      enabledForHosting = false;
    };
  };
}
