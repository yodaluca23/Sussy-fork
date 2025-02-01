/* Functions Used for Adult Filtering  */

export function urlDecodeAndXor(url2) {
    let decodedUrl = decodeURIComponent(url2);
    
    let xorDecodedUrl = __uv$config.decodeUrl(decodedUrl)
    
    return xorDecodedUrl;
}

export async function isFiltered(hostname) {
    try {
      // Check if it's one of our apps or games.
      const appsResponse = await fetch(`${window.location.origin}/apps/apps.json`);
      const gamesResponse = await fetch(`${window.location.origin}/games/games.json`);
  
      if (!appsResponse.ok || !gamesResponse.ok) {
        throw new Error('Failed to fetch one or both of the JSON files');
      }
  
      const appsData = await appsResponse.json();
      const gamesData = await gamesResponse.json();
  
      const combinedData = JSON.stringify({ apps: appsData, games: gamesData });
  
      const encodedHostnames = [
        btoa(hostname).replace(/=/g, ""),
        btoa(`https://${hostname}`).replace(/=/g, ""),
        btoa(`http://${hostname}`).replace(/=/g, "")
      ];
  
      const isInLocalLists = encodedHostnames.some(encodedHostname => combinedData.includes(encodedHostname));
  
      if (isInLocalLists) {
        return false; // Site is in app or game lists.
      }
  
      // Check Cloudflare Family DNS Query
      const dnsOptions = {
        method: 'GET',
        headers: { accept: 'application/dns-json' },
      };
  
      const dnsResponse = await fetch(`https://family.cloudflare-dns.com/dns-query?name=${hostname}`, dnsOptions);
      const dnsData = await dnsResponse.json();
  
      // Check if data.Comment exists and contains "Filtered"
      if (dnsData && Array.isArray(dnsData.Comment) && dnsData.Comment.some(comment => comment.includes("Filtered"))) {
        return true; // Site is filtered (NSFW)
      }
  
      // If not flagged by Cloudflare, return false (SFW)
      return false;
    } catch (error) {
      console.error('Error occurred while checking filter status of hostname:', error);
      return false; // Default to false (SFW)
    }
  }  

export const BlockedHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Website Not Permitted</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 20px; }
        h1 { color: red; }
    </style>
</head>
<body>
    <h1>The site you were trying to access is not permitted by the authors of this website.</h1>
</body>
</html>
`;

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export async function isFilteredNode(hostname) {
  try {
    // Determine the directory name of the current module
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    // Construct absolute paths to the JSON files
    const appsPath = path.join(__dirname, '../static/apps/apps.json');
    const gamesPath = path.join(__dirname, '../static/games/games.json');

    // Read and parse the JSON files
    const appsData = JSON.parse(fs.readFileSync(appsPath, 'utf8'));
    const gamesData = JSON.parse(fs.readFileSync(gamesPath, 'utf8'));

    const combinedData = JSON.stringify({ apps: appsData, games: gamesData });

    // Encode the hostname using Node's Buffer
    const encodedHostnames = [
      Buffer.from(hostname).toString('base64').replace(/=/g, ""),
      Buffer.from(`https://${hostname}`).toString('base64').replace(/=/g, ""),
      Buffer.from(`http://${hostname}`).toString('base64').replace(/=/g, "")
    ];

    // Check if any of the encoded hostnames appear in the combined JSON
    const isInLocalLists = encodedHostnames.some(encodedHostname => combinedData.includes(encodedHostname));
    if (isInLocalLists) {
      return false; // Site is in app or game lists.
    }

    // Check Cloudflare Family DNS Query
    const dnsOptions = {
      method: 'GET',
      headers: { accept: 'application/dns-json' },
    };

    const dnsResponse = await fetch(`https://family.cloudflare-dns.com/dns-query?name=${hostname}`, dnsOptions);
    const dnsData = await dnsResponse.json();

    // Check if dnsData.Comment exists and contains "Filtered"
    if (dnsData && Array.isArray(dnsData.Comment) && dnsData.Comment.some(comment => comment.includes("Filtered"))) {
      return true; // Site is filtered (NSFW)
    }

    // If not flagged by Cloudflare, return false (SFW)
    return false;
  } catch (error) {
    console.error('Error occurred while checking filter status of hostname:', error);
    return false; // Default to false (SFW)
  }
}
