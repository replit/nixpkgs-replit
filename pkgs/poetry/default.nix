{ pkgs }:
let myPackaging = pkgs.python310Packages.buildPythonPackage rec {
    pname = "packaging";
    version = "20.4";
    format = "pyproject";

    src = pkgs.python310Packages.fetchPypi {
      inherit pname version;
      sha256 = "sha256-Q1f3T0e5wS25NiSoIVTpsSD6gpNpmUkVKyIGXVVgefg=";
    };

    nativeBuildInputs = [
      pkgs.python310Packages.setuptools
      pkgs.python310Packages.six
    ];

    propagatedBuildInputs = [ pkgs.python310Packages.pyparsing ];

    # Prevent circular dependency
    doCheck = false;

    meta = with pkgs.lib; {
      description = "Core utilities for Python packages";
      homepage = "https://github.com/pypa/packaging";
      license = with licenses; [ bsd2 asl20 ];
      maintainers = with maintainers; [ bennofs ];
    };
  };

myPoetryCore = pkgs.python310Packages.buildPythonPackage rec {
  pname = "poetry-core";
  version = "1.0.8";
  format = "pyproject";

  src = pkgs.fetchFromGitHub {
    owner = "python-poetry";
    repo = pname;
    rev = version;
    hash = "sha256-cs9SMGD9RdW8Wx/IAMq6gkOUBsney5r19hyGva98grk=";
  };

  propagatedBuildInputs = [
    pkgs.python310Packages.importlib-metadata
  ];

  pythonImportsCheck = [
    "poetry.core"
  ];

  #Allow for package to use pep420's native namespaces
  pythonNamespaces = [
    "poetry"
  ];

  meta = with pkgs.lib; {
    description = "Core utilities for Poetry";
    homepage = "https://github.com/python-poetry/poetry-core/";
    license = licenses.mit;
    maintainers = with maintainers; [ jonringer ];
  };
};

myCrashtest = pkgs.python310Packages.crashtest.overrideAttrs (finalAttrs: prevAttrs: {
  pname = "crashtest";
  version = "0.3.0";
  src = pkgs.python310Packages.fetchPypi {
    pname = "crashtest";
    version = "0.3.0";
    sha256 = "sha256-6cBsyWQAk5q1MnEjo/aZB46q2KYoMkfXsq4Pav/63xQ=";
  };
});
myCliKit = pkgs.python310Packages.clikit.overrideAttrs (finalAttrs: prevAttrs: {
  propagatedBuildInputs = with pkgs.python310Packages; [
    pylev
    pastel
  ]
  ++ lib.optionals (pythonAtLeast "3.6") [ myCrashtest ]
  ++ lib.optionals isPy27 [ typing enum34 ];
});

myCleo = pkgs.python310Packages.cleo.overrideAttrs (finalAttrs: prevAttrs: {
  doCheck = false;
  pname = "cleo";
  version = "0.8.1";
  format = "pyproject";

  src = pkgs.fetchFromGitHub {
    owner = "python-poetry";
    repo = "cleo";
    rev = "refs/tags/0.8.1";
    hash = "sha256-9nqFyU4SkyRdZpubVeO+mmsSGI2iKrVsJ09Ftb3BaI0=";
  };

  patches = [];

  propagatedBuildInputs = [
    myCliKit
    myCrashtest
    pkgs.python310Packages.pylev
  ];
});

myPoetryPluginExport = pkgs.python310Packages.buildPythonPackage rec {
  pname = "poetry-plugin-export";
  version = "1.1.2";
  format = "pyproject";

  src = pkgs.fetchFromGitHub {
    owner = "python-poetry";
    repo = pname;
    rev = "refs/tags/${version}";
    hash = "sha256-+BDBQwYaiddq3OQDHKmLap3ehWJe+Gh5D3TwuNXycjg=";
  };

  postPatch = ''
    sed -i '/poetry =/d' pyproject.toml
  '';

  nativeBuildInputs = [
    myPoetryCore
  ];

  # infinite recursion with poetry
  doCheck = false;
  pythonImportsCheck = [];

  meta = with pkgs.lib; {
    description = "Poetry plugin to export the dependencies to various formats";
    license = licenses.mit;
    homepage = "https://github.com/python-poetry/poetry-plugin-export";
    maintainers = with maintainers; [ hexa ];
  };
};

myCachy = pkgs.python310Packages.buildPythonPackage rec {
  pname = "cachy";
  version = "0.3.0";

  src = pkgs.python310Packages.fetchPypi {
    inherit pname version;
    sha256 = "186581f4ceb42a0bbe040c407da73c14092379b1e4c0e327fdb72ae4a9b269b1";
  };

  propagatedBuildInputs = with pkgs.python310Packages; [
    # redis
    # python-memcached
    msgpack
  ];

  # The Pypi tarball doesn't include tests, and the GitHub source isn't
  # buildable until we bootstrap poetry, see
  # https://github.com/NixOS/nixpkgs/pull/53599#discussion_r245855665
  doCheck = false;

  meta = with pkgs.lib; {
    homepage = "https://github.com/sdispater/cachy";
    description = "Cachy provides a simple yet effective caching library";
    license = licenses.mit;
    maintainers = with maintainers; [ jakewaksbaum ];
  };
};


myPoetry = pkgs.python310Packages.buildPythonPackage rec {
  pname = "poetry";
  version = "1.2.2";
  format = "pyproject";

  src = pkgs.fetchFromGitHub {
    owner = "replit";
    repo = pname;
    rev = "0f0b1b2b7e476e778019ee069a3d40eec622d71b";
    hash = "sha256-KKm6+i8ilPRx19wNaeDjrypdLCqgYE1JKwt2USx7HHk=";
  };

  postPatch = ''
    substituteInPlace pyproject.toml \
      --replace 'crashtest = "^0.3.0"' 'crashtest = "*"' \
      --replace 'xattr = { version = "^0.9.7"' 'xattr = { version = "^0.10.0"'
  '';

  nativeBuildInputs = [
    pkgs.installShellFiles
  ];

  propagatedBuildInputs = with pkgs.python310Packages; [
    cachecontrol
    myCachy
    myCleo
    myCrashtest
    myCliKit
    dulwich

    html5lib
    jsonschema
    keyring
    myPackaging
    pexpect
    pkginfo

    platformdirs
    myPoetryCore
    poetry-plugin-export
    requests
    requests-toolbelt
    shellingham
    tomlkit
    virtualenv
  ] ++ lib.optionals (stdenv.isDarwin) [
    xattr
  ] ++ lib.optionals (pythonOlder "3.10") [
    importlib-metadata
  ] ++ lib.optionals (pythonOlder "3.8") [
    backports-cached-property
  ] ++ cachecontrol.optional-dependencies.filecache;

  postInstall = ''
    installShellCompletion --cmd poetry \
      --bash <($out/bin/poetry completions bash) \
      --fish <($out/bin/poetry completions fish) \
      --zsh <($out/bin/poetry completions zsh) \
  '';

  doCheck = false;

  preCheck = (''
    export HOME=$TMPDIR
  '' + pkgs.lib.optionalString (pkgs.stdenv.isDarwin && pkgs.stdenv.isAarch64) ''
    # https://github.com/python/cpython/issues/74570#issuecomment-1093748531
    export no_proxy='*';
  '');

  postCheck = pkgs.lib.optionalString (pkgs.stdenv.isDarwin && pkgs.stdenv.isAarch64) ''
    unset no_proxy
  '';

  # Allow for package to use pep420's native namespaces
  pythonNamespaces = [
    "poetry"
  ];

  meta = with pkgs.lib; {
    homepage = "https://github.com/replit/poetry";
    description = "Python dependency management and packaging made easy";
    license = licenses.mit;
  };
};
in
myPoetry
