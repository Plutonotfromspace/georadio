/**
 * Vercel API Proxy for CORS-enabled audio streaming
 * 
 * This serverless function proxies radio stream requests to avoid CORS issues.
 * It accepts a URL parameter, validates it, fetches the remote resource,
 * and streams it back with appropriate CORS headers.
 * 
 * Usage: GET /api/proxy?url=https://example.com/stream.mp3
 */

// CORS headers to add to all responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range, Accept',
  'Access-Control-Expose-Headers': 'Content-Type, Content-Length, Accept-Ranges',
};

// HTTP status code constants for clarity
const HTTP_STATUS = {
  PARTIAL_CONTENT: 206,      // Successful range request
  BAD_REQUEST: 400,          // Client error range start
  SERVER_ERROR_MAX: 599,     // Server error range end
  BAD_GATEWAY: 502,          // Default error for upstream failures
};

/**
 * Validates the URL parameter to only allow http/https schemes
 * @param {string} urlString - The URL to validate
 * @returns {{ valid: boolean, url?: URL, error?: string }}
 */
function validateUrl(urlString) {
  if (!urlString) {
    return { valid: false, error: 'Missing required "url" parameter' };
  }

  try {
    const url = new URL(urlString);
    
    // Only allow http and https schemes
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { 
        valid: false, 
        error: `Invalid URL scheme: ${url.protocol}. Only http and https are allowed.` 
      };
    }

    return { valid: true, url };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Handles the proxy request
 * @param {Request} request - The incoming request
 * @returns {Promise<Response>}
 */
export default async function handler(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only allow GET requests
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  // Parse the URL from query parameters
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  // Validate the URL
  const validation = validateUrl(targetUrl);
  if (!validation.valid) {
    return new Response(JSON.stringify({ error: validation.error }), {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    // Forward relevant headers from the original request
    const fetchHeaders = {};
    const rangeHeader = request.headers.get('Range');
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }
    const acceptHeader = request.headers.get('Accept');
    if (acceptHeader) {
      fetchHeaders['Accept'] = acceptHeader;
    }

    // Fetch the remote resource
    const response = await fetch(validation.url.toString(), {
      headers: fetchHeaders,
      // Don't follow redirects automatically - let the client handle them
      redirect: 'follow',
    });

    // If the remote server returns an error, forward it
    // Note: 206 Partial Content is a successful response for range requests
    if (!response.ok && response.status !== HTTP_STATUS.PARTIAL_CONTENT) {
      return new Response(
        JSON.stringify({ 
          error: `Remote server error: ${response.status} ${response.statusText}`,
          originalUrl: targetUrl,
        }), 
        {
          // Forward the original status if it's a valid HTTP error, otherwise return Bad Gateway
          status: response.status >= HTTP_STATUS.BAD_REQUEST && response.status <= HTTP_STATUS.SERVER_ERROR_MAX 
            ? response.status 
            : HTTP_STATUS.BAD_GATEWAY,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Build response headers
    const responseHeaders = { ...corsHeaders };

    // Mirror important headers from the remote response
    const contentType = response.headers.get('Content-Type');
    if (contentType) {
      responseHeaders['Content-Type'] = contentType;
    }

    const contentLength = response.headers.get('Content-Length');
    if (contentLength) {
      responseHeaders['Content-Length'] = contentLength;
    }

    const acceptRanges = response.headers.get('Accept-Ranges');
    if (acceptRanges) {
      responseHeaders['Accept-Ranges'] = acceptRanges;
    }

    const contentRange = response.headers.get('Content-Range');
    if (contentRange) {
      responseHeaders['Content-Range'] = contentRange;
    }

    // Stream the response body back to the client
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch remote resource',
        details: error.message,
        originalUrl: targetUrl,
      }), 
      {
        status: HTTP_STATUS.BAD_GATEWAY,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

// Vercel Edge Runtime configuration
export const config = {
  runtime: 'edge',
};
