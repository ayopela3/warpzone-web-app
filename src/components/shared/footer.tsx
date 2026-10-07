import Link from "next/link"
import Image from "next/image"
import { Mail } from "lucide-react"

/** Lucide does not include brand icons, so we define a minimal Facebook SVG. */
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  )
}

const footerNavigation = {
  shop: [
    { name: "All Cards", href: "/shop" },
    { name: "Pokemon", href: "/shop?category=pokemon" },
    { name: "Magic: The Gathering", href: "/shop?category=mtg" },
    { name: "Yu-Gi-Oh!", href: "/shop?category=yugioh" },
    { name: "Auctions", href: "/auctions" },
  ],
  events: [
    { name: "Tournaments", href: "/tournaments" },
    { name: "Pre-orders", href: "/pre-order" },
  ],
  support: [
    { name: "Contact Us", href: "https://www.facebook.com/warpzonePH", external: true },
    { name: "How Pre-orders Work", href: "/pre-orders/how-it-works", external: false },
  ],
}

const socialLinks = [
  { name: "Email", href: "mailto:warpzone_ph@proton.me", icon: Mail },
  { name: "Facebook", href: "https://www.facebook.com/warpzonePH", icon: FacebookIcon },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/" prefetch={false}>
              <Image src="/images/warpzone.png" alt="The Warpzone" width={140} height={40} className="h-9 w-auto object-contain" />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-background/65">
              Your ultimate destination for trading cards, tournaments, and collectibles.
            </p>
            <div className="mt-4 flex gap-4">
              {socialLinks.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  target={item.href.startsWith("mailto:") ? undefined : "_blank"}
                  rel={item.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                  className="text-background/60 transition-colors hover:text-primary"
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="label-meta text-primary">Shop</h3>
            <ul className="mt-4 space-y-2">
              {footerNavigation.shop.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    className="text-sm text-background/65 transition-colors hover:text-background"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Events */}
          <div>
            <h3 className="label-meta text-primary">Events</h3>
            <ul className="mt-4 space-y-2">
              {footerNavigation.events.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    className="text-sm text-background/65 transition-colors hover:text-background"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="label-meta text-primary">Support</h3>
            <ul className="mt-4 space-y-2">
              {footerNavigation.support.map((item) => (
                <li key={item.name}>
                  {item.external ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-background/65 transition-colors hover:text-background"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      prefetch={false}
                      className="text-sm text-background/65 transition-colors hover:text-background"
                    >
                      {item.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-background/15 pt-8">
          <p className="text-center text-xs text-background/55">
            &copy; {new Date().getFullYear()} The Warpzone. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
