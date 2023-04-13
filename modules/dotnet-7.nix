{ pkgs, ... }: {
  name = ".NET 7 Tools";
  version = "1.0";

  replit.runners.dotnet = {
    name = ".NET";
    language = "dotnet";
    extensions = [".cs" ".csproj" ".fs" ".fsproj"];

    start = "${pkgs.dotnet-sdk_7}/bin/dotnet run";
  };

  replit.languageServers.omni-sharp = {
    name = "OmniSharp";
    language = "dotnet";
    extensions = [".cs" ".csproj" ".fs" ".fsproj"];

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
