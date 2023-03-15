{ pkgs, ... }:
{
  name = "RustTools";
  version = "1.0";

  packages = with pkgs; [
    cargo
    clang
    rustc
    rustfmt
    rust-analyzer
  ];

  replit.runners.cargo = {
    name = "cargo run";
    language = "rust";
    extensions = [".rs"];
    
    start = "${pkgs.cargo}/bin/cargo run";
    fileParam = false;
  };

  replit.languageServers.rust-analyzer = {
    name = "rust-analyzer";
    language = "rust";
    extensions = [".rs"];
    
    start = "${pkgs.rust-analyzer}/bin/rust-analyzer";
  };

  replit.formatters.cargo-fmt = {
    name = "cargo fmt";
    language = "rust";
    extensions = [".rs"];

    start = "${pkgs.cargo}/bin/cargo fmt";
    stdin = false;
  };

  replit.formatters.rustfmt = {
    name = "rustfmt";
    language = "rust";
    extensions = [".rs"];

    start = "${pkgs.rustfmt}/bin/rustfmt $file";
    stdin = false;
  };
}
