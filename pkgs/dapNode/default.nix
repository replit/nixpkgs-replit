{ pkgs }:
let
  nodeDependencies = (pkgs.callPackage ./js-debug { }).nodeDependencies.overrideAttrs (previousAttrs: {
    buildInputs = with pkgs; previousAttrs.buildInputs ++ [
      nodePackages.node-gyp-build
      nodePackages.node-gyp
      pkg-config
      libsecret
    ];
  });

  js-debug = pkgs.stdenv.mkDerivation {
    name = "js-debug";
    version = "1.77.2";

    src = pkgs.fetchFromGitHub {
      owner = "replit";
      repo = "vscode-js-debug";
      rev = "5eac5f8255cd61b238547a7b383a00b971e223da";
      sha256 = "sha256-XvK0r84GLwMZPhPm8IaF1+qVS/WFYkYhj2eqHqM9qlg=";
    };

    buildInputs = [ pkgs.nodejs ];

    installPhase =
      let nodeEscaped = builtins.replaceStrings [ "/" "-" "." ] [ "\\/" "\\-" "\\." ] pkgs.nodejs.outPath;
      in
      ''
        mkdir -p $out/bin
        ln -s ${nodeDependencies}/lib/node_modules ./node_modules
        ln -s ${nodeDependencies}/lib/node_modules $out/node_modules
        ./node_modules/.bin/gulp
        ./node_modules/.bin/gulp debugServerMain:webpack-bundle

        cp -r ./dist $out/dist

        # Add shebang...
        # Wrapping debugServerMain.js in a sh script doesn't work because it needs to read from
        # a pipe directly from the parent (debugproxy)
        printf "#!${nodeEscaped}\/bin\/node\n" | cat - $out/dist/src/debugServerMain.js > $out/dist/src/dap-node

        chmod u+x $out/dist/src/dap-node
        ln -s $out/dist/src/dap-node $out/bin/dap-node
      '';
  };
in
js-debug
