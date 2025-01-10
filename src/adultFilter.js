/*Functions Used for AdultFiltering  */

export function xorDecode(str, key) {
  const keyBytes = key.match(/.{2}/g).map(byte => parseInt(byte, 16));

  let decoded = '';
  for (let i = 0; i < str.length; i++) {
      decoded += String.fromCharCode(str.charCodeAt(i) ^ keyBytes[i % keyBytes.length]);
  }
  return decoded;
}

export function urlDecodeAndXor(url2) {
    let decodedUrl = decodeURIComponent(url2);
    
    let xorDecodedUrl = xorDecode(decodedUrl, atob(atob(atob('VFVSQmQwMXFRWGROUkVrOQ'))));
    
    return xorDecodedUrl;
}

export async function isFiltered(hostname) {
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

export const BlockedHTML = `
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
    <h1>The site you were trying to access is not permitted by the authors of this website.</h1>
</body>
</html>
`;