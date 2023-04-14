{ pkgs, ... }: {
  name = "Dart Tools";
  version = "1.0";

  replit.runners.dart = {
    name = "dart";
    language = "dart";

    start = "${pkgs.dart}/bin/dart main.dart";
  };

  replit.languageServers.dart-pub = {
    name = "dart";
    language = "dart";

    start = "${pkgs.dart}/bin/dart language-server";
  };

  replit.packagers.dart-pub = {
    name = "dart pub";
    language = "dart-pub";
    features = {
      packageSearch = true;
      guessImports = false;
      enabledForHosting = false;
    };
  };
}
