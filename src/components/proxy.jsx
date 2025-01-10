import { bareServerURL } from "../consts.js";
import React, { useEffect } from "react";
import PublicIcon from "@mui/icons-material/Public";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import RefreshIcon from "@mui/icons-material/Refresh";
import CloseIcon from "@mui/icons-material/Close";
import { getWindowLocation } from "../util.js";
import "../style/controls.css";
import BareClient from "@tomphttp/bare-client";
import { useSearchParams } from "react-router-dom";

const NotAImage = [
  "text/html"
]

/**
 * Return a blob URL to a working icon. Returns undefined if none work.
 * @param {BareClient} bare
 * @param {string[]} list List of absolute URLs to icons
 * @returns {string|undefined}
 */
async function workingIcon(bare, list) {
  for (var urlstring of list)
    try {
      const url = new URL(urlstring);
      var res;
      if(url.origin == window.location.origin) res = await fetch(urlstring); else res = await bare.fetch(urlstring); // local file, don't use proxy
      if (!res.ok) continue;
      const blob = await res.blob();
      if(NotAImage.includes(blob.type.split(";")[0])) return; // WE DON'T WANT HTML FILES
      return URL.createObjectURL(blob);
    } catch (err) {
      console.warn('There was a error while updating the (working) icon:');
      console.error(err);
    }
}

/**
 * Loads an image. If the image src is a blob, the blob will be revoked upon dismount.
 */
function BareIcon({ src, ...attributes }) {
  React.useEffect(() => {
    return () => {
      if (src.startsWith("blob:")) {
        URL.revokeObjectURL(src);
      }
    };
  }, [src]);

  // eslint-disable-next-line
  return <img src={src} {...attributes} />;
}

var Proxy = React.forwardRef(({ overrideWindow }, ref) => {
  var bare = React.useMemo(() => new BareClient(bareServerURL), []);
  var web = React.createRef();
  var [config, setConfig] = React.useState();
  var [searchParams, setSearchParams] = useSearchParams();
  // config.preferControl
  React.useImperativeHandle(
    ref,
    () => ({
      open: (config) => {
        document.body.style.overflow = "hidden";
        searchParams.set("fr", "");
        setSearchParams(searchParams);
        setConfig({
          url: config.url,
          title: null,
          icon: null
        });
        setConfig(config);
      }
    }),
    [overrideWindow, searchParams, setSearchParams]
  );

  function close() {
    document.body.style.overflow = "";
    setConfig();
  }

  // close frame when ?frame removed (user went back in history)
  useEffect(() => {
    if (!searchParams.has("fr")) close();
  }, [searchParams]);

  if (!config) return;
  if(config?.controls) document.getElementsByTagName("body")[0].setAttribute("controls", config.controls);
  return (
    <>
      <div className="controls">
        <div className="controlsIcon">
          {config.icon ? (
            <BareIcon src={config.icon} alt="Website" />
          ) : (
            <PublicIcon fontSize="large" />
          )}
        </div>
        <div className="controlsTitle">{config.title || "Loading..."}</div>
        <div
          className="controlsButton"
          onClick={() => {
            web.current.requestFullscreen();
          }}
        >
          <FullscreenIcon />
        </div>
        <div
          className="controlsButton"
          onClick={() => {
            try {
              web.current.contentWindow.location.reload();
            } catch (err) {
              //
            }
          }}
        >
          <RefreshIcon />
        </div>
        <div className="controlsButton" onClick={close}>
          <CloseIcon />
        </div>
      </div>
      <iframe
      tabIndex={1}
        onLoad={async () => {
          var updatedConfig = {
            url: config.url,
          };

          updatedConfig.title =
            web.current.contentWindow.document.title ||
            getWindowLocation(web.current);
          console.log("[135] Navigating to Link: " + getWindowLocation(web.current));
          function xorDecode(str, key) {
              const keyBytes = key.match(/.{2}/g).map(byte => parseInt(byte, 16));
          
              let decoded = '';
              for (let i = 0; i < str.length; i++) {
                  decoded += String.fromCharCode(str.charCodeAt(i) ^ keyBytes[i % keyBytes.length]);
              }
              return decoded;
            }
            
            function urlDecodeAndXor(url2) {
                let decodedUrl = decodeURIComponent(url2);
                
                let xorDecodedUrl = xorDecode(decodedUrl, atob(atob(atob('VFVSQmQwMXFRWGROUkVrOQ'))));
                
                return xorDecodedUrl;
            }
            
            async function isFiltered(hostname) {
              try {
                const options = {
                  method: 'GET',
                  headers: { accept: 'application/dns-json' }
                };
            
                var response = await fetch(`https://family.cloudflare-dns.com/dns-query?name=${hostname}`, options);
                var data = await response.json();
            
                if (data && Array.isArray(data.Comment) && data.Comment.some(comment => comment.includes("Filtered"))) {
                  return true; // Site is filtered (NSFW)
                } else {
                  return false; // Site is not filtered (SFW)
                }
              } catch (error) {
                console.error('Error occurred while checking hostname:', error);
                return false; // Default to false if an error occurs
              }
            }
            
            var url = getWindowLocation(web.current)
          
            var result = "";
            
            if (url.includes("/data-load-uv.html#")) {
                result = atob(url.replace(window.location.hostname + "/data-load-uv.html#", "").replace("https://","").replace("http://",""));
            } else if (url.includes(window.location.hostname)) {
                result = urlDecodeAndXor(url.replace(/.*\/(rho\/|co\/|sw-src\/)/, ""));
            } else {
                result = url;
            }
            
            var host = new URL(result).hostname;
            
            console.log(host);
            
            const BlockedHTML = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Not Permitted Website</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
                    h1 { color: red; }
                </style>
            </head>
            <body>
                <h1>This site is not permitted by the authors of the website.</h1>
            </body>
            </html>
            `;
            
            
            isFiltered(host).then((result) => {
              if (result) {
                console.log(`${host} is filtered (NSFW).`);
                document.open();
                document.write(BlockedHTML);
                document.close();
              }
            }).catch(error => {
              console.error('Error occurred while checking filter status of hostname:', error);
            });
          
          var icon = web.current.contentWindow.document.querySelector(
            "link[rel*='icon'],link[rel='shortcut icon']"
          );

          updatedConfig.icon = await workingIcon(
            bare,
            [
              icon && icon.href,
              new URL(
                "/favicon.ico",
                web.current.contentWindow.document.baseURI
              ).toString(),
            ].filter(Boolean)
          );

          setConfig(updatedConfig);
        }}
        ref={web}
        className="web"
        src={config.url}
        title="Website"
      ></iframe>
    </>
  );
});

export { Proxy as default };
