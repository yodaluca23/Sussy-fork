// adultFilterMiddleware.js
import { isFilteredNode, BlockedHTML } from './adultFilter.js';

export async function adultFilterMiddleware(req, res, next) {
  // Bypass filtering for requests that are used to fetch the JSON lists.
  if (req.originalUrl.startsWith("/apps/") || req.originalUrl.startsWith("/games/")) {
    return next();
  }
  
  try {
    const hostname = req.hostname;
    const filtered = await isFilteredNode(hostname);
    
    if (filtered) {
      return res.status(403).send(BlockedHTML);
    }
    next();
  } catch (error) {
    console.error('Error in adult filter middleware:', error);
    next(error);
  }
}
