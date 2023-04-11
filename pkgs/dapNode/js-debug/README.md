# js-debug Package

This Nix package installs and builds the DAP server in
https://github.com/replit/vscode-js-debug.

The `.nix` files were generated using [node2nix](https://github.com/svanderburg/node2nix) by the command:

```
node2nix -d
```

which uses the `package.json` file as input, which was grabbed from https://github.com/svanderburg/node2nix
at rev 483425e50cf0fb313610d2346b51459c8db556e2, then removing the playwright package as I couldn't
get that to build.