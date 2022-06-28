# nixpkgs-replit

`nixpkgs-replit` is Replit's nixpkgs overlay. This overlay provides several
[channels](https://nixos.wiki/wiki/Nix_channels) that track the upstream nix
channels of the same name.

## Using the overlay
You can use this overlay by creating any new repl on
[Replit](https://replit.com/new/nix). If you would like to use it locally, you
can add it as a channel.

```
nix-channel --add https://storage.googleapis.com/replit-nixpkgs/nixpkgs-21.11.tar.gz  replit-nixpkgs
nix-channel --update
nix-shell -E "import <nixpkgs-stable-21_11>{}" -A replitPackages.replbox
```

## Building the overlay
You can build packages out of the overlay with the `nix-build` command. The
resulting package will be placed in the `result` directory for testing.

```
# Build the replbox common interpreter frontend
nix-build -A replitPackages.replbox
```

You can also fork [this repl](https://replit.com/@ZachAtReplit/overlay), which
contains the overlay repository, and allows testing packages from the overlay
directly in `replit.nix`.

## Updating the overlay base
You can update the pinned base channels by running `./update.sh`. The update
script will use niv to update the pinned channels to the latest revisions
according to nixpkgs.

## Adding a new base channel
You can add additional channels by running `./add.sh <channel>`. For example
`./add.sh 22.05` to add the `release-22.05` branch.

