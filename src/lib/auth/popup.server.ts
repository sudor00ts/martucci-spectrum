export async function handleAuthPopupRequest(_req: Request): Promise<Response> {
  return new Response("<html><body>Auth popup no está habilitado en este deploy.</body></html>", {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
