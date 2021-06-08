{ pkgs ? import <nixpkgs> { overlays = [ (import ./default.nix) ]; } }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    upm
  ];
}
