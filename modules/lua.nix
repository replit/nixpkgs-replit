{ pkgs, ... }: 

assert pkgs.lua.version == "5.2.4";

{
  name = "Lua Tools";
  version = "5.0";

  packages = with pkgs; [
    lua
  ];

  replit.runners.run = {
    name = "Lua script";
    language = "lua";

    start = "${pkgs.lua}/bin/lua $file";
    fileParam = true;
  };

  replit.languageServers.sumneko = {
    name = "lua-language-server";
    language = "lua";

    start = "${pkgs.sumneko-lua-language-server}/bin/lua-language-server";
  };
}
