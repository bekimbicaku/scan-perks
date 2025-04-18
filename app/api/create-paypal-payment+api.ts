export async function POST(request: Request) {
  try {
    const { amount, plan } = await request.json();

    // Create PayPal order
    const response = await fetch('https://api-m.sandbox.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${Buffer.from(
          `${process.env.EXPO_PUBLIC_PAYPAL_CLIENT_ID}:${process.env.EXPO_PUBLIC_PAYPAL_SECRET}`
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: amount.toString(),
            },
            description: `${plan} Plan Subscription`,
          },
        ],
      }),
    });

    const data = await response.json();

    return Response.json(data);
  } catch (error) {
    console.error('PayPal API Error:', error);
    return new Response('Payment processing failed', { status: 500 });
  }
}