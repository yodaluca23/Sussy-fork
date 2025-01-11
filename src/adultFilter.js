/* Functions Used for Adult Filtering  */

export function urlDecodeAndXor(url2) {
    let decodedUrl = decodeURIComponent(url2);
    
    let xorDecodedUrl = __uv$config.decodeUrl(decodedUrl)
    
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
    console.error('Error occurred while checking filter status of hostname:', error);
    return false;
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