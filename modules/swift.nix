{ pkgs, ... }:
{
  name = "SwiftTools";
  version = "1.0";

  packages = with pkgs; [
    swift
    clang
  ];

  replit.runners.swift = {
    name = "Swift";
    language = "swift";
    extensions = [".swift"];
    start = "./\${file%.swift}.bin";
    compile = "${pkgs.swift}/bin/swiftc $file -o \${file%.swift}.bin";
    fileParam = true;
  };

  replit.languageServers.sourcekit = {
    name = "SourceKit";
    language = "swift";
    extensions = [".swift"];
    
    start = "${pkgs.swift}/bin/sourcekit-lsp";
  };

}
