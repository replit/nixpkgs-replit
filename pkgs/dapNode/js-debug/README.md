# js-debug Package

This Nix package installs and builds the DAP server in
https://github.com/replit/vscode-js-debug.

The `.nix` files were generated using [node2nix](https://github.com/svanderburg/node2nix) by the command:

```
node2nix -d
```

which uses the `package.json` file as input, which was grabbed from https://github.com/replit/vscode-js-debug
at rev 5eac5f8255cd61b238547a7b383a00b971e223da, then removing the playwright package as I couldn't
get that to build.