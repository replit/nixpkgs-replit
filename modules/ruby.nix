{ pkgs, ... }: let
  ruby = pkgs.ruby_3_1;
  rubyPackages = pkgs.rubyPackages_3_1;
in {
  name = "Ruby Tools";
  version = "1.0";

  packages = with pkgs; [
    ruby
  ];

  replit.runners.bundle = {
    name = "Bundle";
    language = "ruby";

    compile = "${ruby}/bin/bundle install";
    start = "${ruby}/bin/bundle exec ruby $file";
    fileParam = true;
  };

  replit.languageServers.solargraph = {
    name = "Solargraph: A Ruby Language Server";
    language = "ruby";

    start = "${rubyPackages.solargraph}/bin/solargraph stdio";
  };

  replit.packagers.ruby = {
    name = "Ruby";
    language = "ruby";
    features = {
      packageSearch = true;
      guessImports = true;
      enabledForHosting = false;
    };
  };
}
