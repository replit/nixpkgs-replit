{ pkgs, ... }: let
  run-replbox = pkgs.writeShellScriptBin "run-replbox" ''
    ${pkgs.replitPackages.replbox}/bin/replit-replbox \
      --ps1 "''$(printf '\u0001\u001b[33m\u0002\u0001\u001b[00m\u0002 ')" \
      -i qbasic ''$1
  '';
in {
  name = "QBASIC Tools";
  version = "1.1";

  replit.runners.replbox-qbasic = {
    name = "ReplBox QBASIC";
    language = "basic";

    start = "${run-replbox}/bin/run-replbox $file";
    interpreter = true;
    fileParam = true;
  };
}
