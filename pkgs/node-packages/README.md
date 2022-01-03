# node-packages

We use [node2nix](https://github.com/svanderburg/node2nix) to generate Nix expressions to build Node packages that we would like to have available in the overlay.

Add new packages to `node-packages.json` and run `node2nix -i node-packages.json` to regenerate the Nix expressions.

