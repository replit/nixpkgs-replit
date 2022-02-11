{ stdenv
, ant
, maven
, fetchFromGitHub
, graalvm11-ce
, makeWrapper
}:

stdenv.mkDerivation {
  name = "nbcode";
  src = fetchFromGitHub {
    owner = "apache";
    repo = "netbeans";
    rev = "9dc2a2ec33ffceb5b5c9efab026d07a272bb1cc9";
    sha256 = "1psa4wf0g1gqxb11p813d583y1qwcb6dxfv3izj7z4m21x65wjan";
  };

 buildInputs = [ graalvm11-ce ];
 nativeBuildInputs = [ graalvm11-ce ant maven makeWrapper ];
 buildPhase = ''
   ${ant}/bin/ant build
   rm java/java.source.base/test/unit/src/org/netbeans/modules/java/source/indexing/CrashingAPTest.java
   cd java/java.lsp.server
   ${ant}/bin/ant build-lsp-server
 '';

 installPhase = "cp -r vscode/nbcode $out";

 outputHashAlgo = "sha256";
 outputHashMode = "recursive";
 outputHash = "1ac1151jri18nlxz2iq5l1ng39a062ql39y6nxm0pd1r2h593pnk";
}
