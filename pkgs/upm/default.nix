{ lib, buildGoModule, fetchFromGitHub, statik }:

buildGoModule rec {
    name = "upm";
    version = "5bb15f9";

    src = fetchFromGitHub{
        owner = "replit";
        repo = "upm";
        rev = "${version}";
        sha256 = "0iy4qjgqxsh3098ybfnjr5xaixqam7xyqnflvxydpccb85681j8r";
    };

    vendorSha256 = "1fjk4wjcqdkwhwgvx907pxd9ga8lfa36xrkh64ld5b8d0cv62mzv";

    preBuild = ''
        ${statik}/bin/statik -src resources -dest internal -f
        go generate ./internal/backends/python
    '';

    doCheck = false;
}

