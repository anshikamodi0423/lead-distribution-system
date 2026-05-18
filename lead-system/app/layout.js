import "./globals.css";

export const metadata = {
  title: "Prowider — Lead Distribution System",
  description: "Mini Lead Distribution System — BookMyPackers Assessment",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav className="navbar">
          <a href="/" className="brand">
            <span className="brand-dot" />
            Prowider
          </a>
          <div className="nav-links">
            <a href="/request-service">Submit Lead</a>
            <a href="/dashboard">Dashboard</a>
            <a href="/test-tools">Test Tools</a>
          </div>
        </nav>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
