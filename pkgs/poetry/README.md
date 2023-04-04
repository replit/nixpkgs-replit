# Repl.it Custom Poetry Nix package

## Why do we need this?

We have some custom changes to:

* [Poetry](https://github.com/replit/poetry) - for some performance optimizations when
resolving what packages to fetch (avoid downloading .tar.gz source distributions and building them)
* [Pip](https://github.com/replit/pip) - for integration with our Python package cacache

Previously/currently we had an inelegent way of pre-installing these packages in the virtual environment
of the Repl in replspace. See https://replit.com/@util/Pythonify for details. Instead of this, we want to
instead have one install path via Nix that gets these two custom programs into a Repl without
having to install them into replspace. The python Nix module will bring it all together.

## Problems

Things that make this difficult are:

* in order to prevent poetry from including its own dependencies (requests, in particular) during its operation
we need to install it inside its own virtual environment the way their [official installer](https://python-poetry.org/docs/#installing-with-the-official-installer) does. Using this workaround: https://github.com/replit/poetry/blob/replit-1.1/poetry/utils/env.py#L885 poetry can use the environment of the project for its operations, ignoring its own environment
* creating a virtual environment in replspace has a few downsides:
  1. somewhat slow ~2 second
  2. the generated environment contains a config file `pyvenv.cfg` that has a reference to the path of the
    python executable, which in our case would be coming from the `/nix/store` directory. It breaks if we use
    a different version of python with it

## How does it work?

1. For pip (`pkgs/pip/default.nix`), we'll install it using the buildPythonPackage helper
2. For poetry:
  * because a Nix build as isolated away from internet access, we run `fetch-bundle.sh` script during dev time
    to fetch poetry plus its
    dependencies and store it in tarball: `poetry.bundle.tar.gz`. This file is checked in, and needs to be
    regenerated whenever poetry is updated
  * during the Nix build `pkgs/poetry/default.nix`, we:
    a. create a virtual environment
    b. install our version of poetry from the tarball into it
    c. make a symlink to the poetry within that environment for easy access
3. Inside a repl, the custom pip and poetry will be made available to the user via the `PATH` variable.
pip will be instructed to install packages via 
[user install mode](https://pip.pypa.io/en/stable/user_guide/#user-installs) via the `PIP_USER` variable.
This is commonly used for shared Linux systems where the user does not have write access
to the system Python's site-packages directory. The `PYTHONUSERBASE` variable will tell pip where to install packages
in user mode, and we'll point it to a directory in replspace `$HOME/$REPL_SLUG/.pythonlibs`. The site package directory
within this directory (`$HOME/$REPL_SLUG/.pythonlibs/lib/python3.10/site-packages`) is added to the `PYTHONPATH`
variable so it gets into python's module search path. Using user install mode means we avoid the downsides of using
virtual env.

