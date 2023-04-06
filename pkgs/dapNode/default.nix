{ pkgs }:
let
  nodeDependencies = (pkgs.callPackage ./js-debug {
  }).nodeDependencies.overrideAttrs (previousAttrs: {
    buildInputs = with pkgs; previousAttrs.buildInputs ++ [
        nodePackages.node-gyp-build nodePackages.node-gyp pkg-config libsecret
      ];
  });

  js-debug = pkgs.stdenv.mkDerivation {
    name = "js-debug";
    version = "1.77.2";

    src = pkgs.fetchFromGitHub {
      owner = "microsoft";
      repo = "vscode-js-debug";
      rev = "483425e50cf0fb313610d2346b51459c8db556e2";
      sha256 = "sha256-9YDSjDnUIVAa3n3VpUaqHIfYHCg4cBsQMN6Dz5r4EYk=";
    };

    buildInputs = [ pkgs.nodejs ];

    installPhase = ''
    mkdir -p $out
    ln -s ${nodeDependencies}/lib/node_modules ./node_modules
    ln -s ${nodeDependencies}/lib/node_modules $out/node_modules
    ./node_modules/.bin/gulp
    ./node_modules/.bin/gulp dapDebugServer:webpack-bundle

    cp -r ./dist $out/dist
    '';
  };
in
  pkgs.writeShellScriptBin "dap-node" ''
    ${pkgs.nodejs}/bin/node ${js-debug}/dist/src/dapDebugServer.js
  ''
