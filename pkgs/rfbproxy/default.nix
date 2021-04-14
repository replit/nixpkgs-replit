{ lib, rustPlatform, fetchFromGitHub, openssl, stdenv, libpulseaudio, pkg-config, protobuf }:

rustPlatform.buildRustPackage rec {
  pname = "rfbproxy";
  version = "0.1.1-90b68e1";

  src = fetchFromGitHub {
    owner = "replit";
    repo = "rfbproxy";
    rev = "v${version}";
    sha256 = "0v33xmqv7fcaq1spiq7mvqpsx47r6ghgsbv4yhcghalxmy7cb2gc";
  };

  cargoSha256 = "028jlwdgbzkn1rc2kc1n3axpb419g5v04s7pc603h86jh9q1s6s1";

  buildInputs = [ openssl libpulseaudio ];
  nativeBuildInputs = [ pkg-config protobuf ];
}

