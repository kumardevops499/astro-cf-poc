import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();

    if (!data.name || !data.email) {
      return new Response(
        JSON.stringify({ success: false, message: 'Name and email are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const timestamp = new Date().toISOString();
    const leadId = `lead_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

    const record = {
      id: leadId,
      name: data.name,
      email: data.email,
      submittedAt: timestamp,
    };

    // 1. Save to Cloudflare KV first (fault-tolerant lead backup)
    await env.ENQUIRIES.put(leadId, JSON.stringify(record));

    // 2. Dispatch notification email via Resend REST API
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'POC Contact Form <onboarding@resend.dev>',
        to: [env.CONTACT_EMAIL],
        subject: `New POC Enquiry from ${data.name}`,
        html: `
          <h2>New Enquiry Received</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>KV Record ID:</strong> ${leadId}</p>
          <p><strong>Time (UTC):</strong> ${timestamp}</p>
        `,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text();
      console.error('Resend API Error:', errText);
      return new Response(
        JSON.stringify({
          success: true,
          message: `Saved to KV (${leadId}), but email delivery failed. Check logs.`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Hello ${data.name}! Saved to KV (${leadId}) and sent to your email.`,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Contact endpoint error:', error);
    return new Response(
      JSON.stringify({ success: false, message: 'Server error processing enquiry.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};