export const DONATE_ALIAS = "spacemen3.mp";
export const DONATE_URL = "https://www.mercadopago.com.ar/";
export const DONATE_LABEL = "Donar con Mercado Pago";
export const DONATE_AMOUNTS = [1000, 2500, 5000, 10000] as const;
export const MP_SDK_SRC = "https://sdk.mercadopago.com/js/v2";

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => {
      bricks: () => {
        create: (
          name: "wallet",
          containerId: string,
          settings: {
            initialization: { preferenceId: string };
            customization?: { texts?: { valueProp?: string } };
          },
        ) => Promise<{ unmount?: () => void }>;
      };
    };
  }
}

export function loadMercadoPagoSdk(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${MP_SDK_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("No se pudo cargar Mercado Pago")), { once: true });
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = MP_SDK_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar Mercado Pago"));
    document.head.appendChild(script);
  });
}
