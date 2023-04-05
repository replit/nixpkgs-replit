# TODO: Build this via node2nix so we can avoid vendoing all of js-debug
{ runCommand }:

runCommand "node-dap" { } ''
  mkdir -p $out/bin

  cp -R ${./js-debug}/. $out/js-debug
  chmod +x $out/js-debug/run.js

  ln -s $out/js-debug/run.js $out/bin/dap-node

''
