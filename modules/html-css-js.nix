{ pkgs, ... }: {
  name = "HTML, CSS, and JS Tools";
  version = "1.0";

  packages = [ ];

  replit.languageServers.html = {
    name = "HTML Language Server";
    language = "html";
    extensions = [".html"];

    start = "${pkgs.nodePackages.vscode-langservers-extracted}/bin/vscode-html-language-server --stdio";

    initializationOptions = {
      enable = true;
      provideFormatter = true;
    };

    configuration.html = {
      customData = [];
      autoCreateQuotes = true;
      autoClosingTags = true;
      mirrorCursorOnMatchingTag = false;

      completion.attributeDefaultValue = "doublequotes";

      format = {
        enable = true;
        wrapLineLength = 120;
        unformatted = "wbr";
        contentUnformatted = "pre,code,textarea";
        indentInnerHtml = false;
        preserveNewLInes = true;
        indentHandlebars = false;
        endWithNewline = false;
        extraLiners = "head, body, /html";
        wrapAttributes = "auto";
        templating = false;
        unformattedContentDelimiter = "";
      };

      suggest.html5 = true;

      validate = {
        scripts = true;
        styles = true;
      };

      hover = {
        documentation = true;
        references = true;
      };

      trace.server = "off";
    };
  };

  replit.languageServers.typescript = {
    name = "TypeScript Language Server";
    language = "typescript";
    extensions = [".js" ".jsx" ".ts" ".tsx" ".mjs" ".mts" ".cjs" ".cts" ".es6"];   

    start = "${pkgs.nodePackages.typescript-language-server}/bin/typescript-language-server --stdio";
  };

  replit.languageServers.css = {
    name = "CSS Language Server";
    language = "css";
    extensions = [".css" ".less" ".scss"];

    start = "${pkgs.nodePackages.vscode-langservers-extracted}/bin/vscode-css-language-server --stdio";

    configuration = let 
      config = {
        completion = {
          triggerPropertyValueCompletion = true;
          completePropertyWithSemicolon = true;
        };
  
        hover = {
          documentation = true;
          references = true;
        };
  
        lint = {
          argumentsInColorFunction = "error";
          boxModel = "ignore";
          compatibleVendorPrefixes = "ignore";
          duplicateProperties = "warning";
          emptyRules = "warning";
          float = "ignore";
          fontFaceProperties = "warning";
          hexColorLength = "error";
          idSelector = "ignore";
          ieHack = "ignore";
          important = "ignore";
          importStatement = "ignore";
          propertyIgnoredDueToDisplay = "warning";
          universalSelector = "ignore";
          unknownAtRules = "warning";
          unknownProperties = "warning";
          unknownVendorSpecificProperties = "ignore";
          validProperties = [];
          vendorPrefix = "warning";
          zeroUnits = "ignore";
        };
  
        trace.server = "off";
      };
    in {
      css = config;
      scss = config;
      less = config;
    };
  };
}
