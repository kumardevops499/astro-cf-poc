import type { APIRoute } from 'astro';

// This flag tells Astro and Cloudflare NOT to prerender this route into static HTML.
// It will run dynamically as a Cloudflare Worker on every request.
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    // Basic validation
    if (!data.name || !data.email) {
      return new Response(
        JSON.stringify({ success: false, message: 'Name and email are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return confirmation with server-generated metadata
    return new Response(
      JSON.stringify({
        success: true,
        message: `Hello ${data.name}! Your enquiry was received by the Cloudflare edge server.`,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: 'Invalid request body.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};