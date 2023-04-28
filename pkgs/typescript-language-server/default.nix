{ pkgs }:
let typescript-language-server = pkgs.nodePackages.typescript-language-server.override {
  nativeBuildInputs = [ pkgs.makeWrapper ];
  postInstall = ''
    wrapProgram "$out/bin/typescript-language-server" \
      --suffix PATH : ${pkgs.lib.makeBinPath [ pkgs.nodePackages.typescript ]} \
      --add-flags "--tsserver-path ${pkgs.nodePackages.typescript}/lib/node_modules/typescript/lib/"
  '';
};
in
{
  name = "TypeScript Language Server";
  language = "javascript";
  start = "${typescript-language-server}/bin/typescript-language-server --stdio";
}
