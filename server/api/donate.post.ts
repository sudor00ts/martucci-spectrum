const PRESETS = new Set([1000, 2500, 5000, 10000]);

export default defineEventHandler(async (event) => {
  const body = (await readBody(event).catch(() => ({}))) as { amount?: number };
  const amount = Math.round(Number(body.amount));
  if (!Number.isFinite(amount) || amount < 100 || amount > 200000) {
    setResponseStatus(event, 400);
    return { error: "Monto inválido" };
  }
  if (!PRESETS.has(amount) && amount % 100 !== 0) {
    setResponseStatus(event, 400);
    return { error: "Usá un monto en pesos enteros" };
  }

  const token = process.env.MP_ACCESS_TOKEN ?? "";
  const publicKey = process.env.MP_PUBLIC_KEY ?? process.env.VITE_MP_PUBLIC_KEY ?? "";
  if (!token || !publicKey) {
    return { configured: false };
  }

  const origin = getRequestURL(event).origin;
  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          title: "Donación Martucci Spectrum",
          description: "Aporte voluntario al desarrollo open source",
          quantity: 1,
          currency_id: "ARS",
          unit_price: amount,
        },
      ],
      statement_descriptor: "MARTUCCI",
      back_urls: {
        success: `${origin}/?donate=ok`,
        pending: `${origin}/?donate=pending`,
        failure: `${origin}/?donate=error`,
      },
      auto_return: "approved",
      purpose: "onboarding_credits",
    }),
  });

  const data = (await response.json()) as { id?: string; init_point?: string; message?: string };
  if (!response.ok || !data.id) {
    setResponseStatus(event, 502);
    return { error: data.message ?? "Mercado Pago no pudo crear el pago" };
  }

  return {
    configured: true,
    preferenceId: data.id,
    initPoint: data.init_point ?? null,
    publicKey,
    amount,
  };
});
