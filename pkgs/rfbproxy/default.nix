{ lib, rustPlatform, fetchFromGitHub, openssl, stdenv, libpulseaudio }:

rustPlatform.buildRustPackage rec {
  pname = "rfbproxy";
  version = "cad8cb3";

  src = fetchFromGitHub {
    owner = "replit";
    repo = "rfbproxy";
    rev = "${version}";
    sha256 = "0v33xmqv7fcaq1spiq7mvqpsx47r6ghgsbv4yhcghalxmy7cb2gc";
  };

  cargoSha256 = "17qnhkwmjggq6mbafy5jkdn6i8n6i7c09yq8c4w79vqh87f4y5dn";

  buildInputs = [ openssl libpulseaudio ];
}

