{ pkgs ? import <nixpkgs> { }
, configPath
}:

(pkgs.lib.evalModules {
  modules = [
    configPath
    (import ./repl-environment.nix)
  ];
  specialArgs = {
    inherit pkgs;
    modulesPath = builtins.toString ./.;
  };
}).config.replit.buildModule
