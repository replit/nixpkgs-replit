{ pkgs, ... }: let
  extensions = [".cs" ".csproj" ".fs" ".fsproj"];
in {
  name = ".NET 7 Tools";
  version = "1.0";

  replit.runners.dotnet = {
    inherit extensions;
    name = ".NET";
    language = "dotnet";

    start = "${pkgs.dotnet-sdk_7}/bin/dotnet run";
  };

  replit.languageServers.omni-sharp = {
    inherit extensions;
    name = "OmniSharp";
    language = "dotnet";

    start = "${pkgs.omnisharp-roslyn}/bin/OmniSharp --languageserver";
  };

  replit.packagers.dotnet = {
    name = ".NET";
    language = "dotnet";
    features = {
      packageSearch = true;
      guessImports = false;
      enabledForHosting = false;
    };
  };
}
