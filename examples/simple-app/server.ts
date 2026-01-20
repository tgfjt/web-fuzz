// シンプルなテスト用Webサーバー
// deno run -A examples/simple-app/server.ts

const PORT = 8080;

const HTML_PAGES: Record<string, string> = {
  "/": `<!DOCTYPE html>
<html>
<head><title>Home</title></head>
<body>
  <h1>Welcome to Simple App</h1>
  <nav>
    <a href="/">Home</a> |
    <a href="/about">About</a> |
    <a href="/contact">Contact</a>
  </nav>
</body>
</html>`,

  "/about": `<!DOCTYPE html>
<html>
<head><title>About</title></head>
<body>
  <h1>About Us</h1>
  <nav>
    <a href="/">Home</a> |
    <a href="/about">About</a> |
    <a href="/contact">Contact</a>
  </nav>
  <p>This is a simple test application for web-fuzz.</p>
</body>
</html>`,

  "/contact": `<!DOCTYPE html>
<html>
<head><title>Contact</title></head>
<body>
  <h1>Contact Us</h1>
  <nav>
    <a href="/">Home</a> |
    <a href="/about">About</a> |
    <a href="/contact">Contact</a>
  </nav>
  <form id="contact-form" method="POST" action="/contact">
    <div>
      <label>Name: <input type="text" name="name" /></label>
    </div>
    <div>
      <label>Email: <input type="email" name="email" /></label>
    </div>
    <div>
      <label>Message: <textarea name="message"></textarea></label>
    </div>
    <button type="submit">Send</button>
  </form>
</body>
</html>`,

  "/contact-success": `<!DOCTYPE html>
<html>
<head><title>Thank You</title></head>
<body>
  <h1>Thank You!</h1>
  <p>Your message has been sent.</p>
  <a href="/">Back to Home</a>
</body>
</html>`,
};

async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  // Handle form POST
  if (req.method === "POST" && path === "/contact") {
    return new Response(null, {
      status: 302,
      headers: { Location: "/contact-success" },
    });
  }

  // Serve HTML pages
  const html = HTML_PAGES[path];
  if (html) {
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  // 404
  return new Response("Not Found", { status: 404 });
}

console.log(`Server running at http://localhost:${PORT}/`);
Deno.serve({ port: PORT }, handler);
