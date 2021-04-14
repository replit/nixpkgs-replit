{ lib, rustPlatform, fetchFromGitHub, openssl, stdenv, libpulseaudio, pkg-config }:

rustPlatform.buildRustPackage rec {
  pname = "rfbproxy";
  version = "0.1.1-90b68e1";

  src = fetchFromGitHub {
    owner = "replit";
    repo = "rfbproxy";
    rev = "v${version}";
    sha256 = "0v33xmqv7fcaq1spiq7mvqpsx47r6ghgsbv4yhcghalxmy7cb2gc";
  };

  cargoSha256 = "17qnhkwmjggq6mbafy5jkdn6i8n6i7c09yq8c4w79vqh87f4y5dn";

  buildInputs = [ openssl libpulseaudio ];
  nativeBuildInputs = [ pkg-config ];
}

