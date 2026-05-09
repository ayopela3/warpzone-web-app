import Link from "next/link"
import Image from "next/image"
import { Globe, MessageCircle, Video, Share2 } from "lucide-react"

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
    { name: "Calendar", href: "/tournaments/calendar" },
    { name: "Results", href: "/tournaments/results" },
    { name: "Pre-order", href: "/pre-order" },
  ],
  support: [
    { name: "Contact Us", href: "/contact" },
    { name: "FAQ", href: "/faq" },
    { name: "Shipping Info", href: "/shipping" },
    { name: "Returns", href: "/returns" },
  ],
  company: [
    { name: "About Us", href: "/about" },
    { name: "Careers", href: "/careers" },
    { name: "Press", href: "/press" },
    { name: "Partners", href: "/partners" },
  ],
}

const socialLinks = [
  { name: "Facebook", href: "#", icon: Globe },
  { name: "Twitter", href: "#", icon: MessageCircle },
  { name: "Instagram", href: "#", icon: Share2 },
  { name: "YouTube", href: "#", icon: Video },
]

export function Footer() {
  return (
    <footer className="bg-muted">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link href="/">
              <Image src="/images/warpzone.png" alt="The Warpzone" width={140} height={40} className="h-9 w-auto object-contain" />
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Your ultimate destination for trading cards, tournaments, and collectibles.
            </p>
            <div className="mt-4 flex gap-4">
              {socialLinks.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="h-5 w-5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-sm font-semibold">Shop</h3>
            <ul className="mt-4 space-y-2">
              {footerNavigation.shop.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Events */}
          <div>
            <h3 className="text-sm font-semibold">Events</h3>
            <ul className="mt-4 space-y-2">
              {footerNavigation.events.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold">Support</h3>
            <ul className="mt-4 space-y-2">
              {footerNavigation.support.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold">Company</h3>
            <ul className="mt-4 space-y-2">
              {footerNavigation.company.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t pt-8">
          <p className="text-sm text-muted-foreground text-center">
            &copy; {new Date().getFullYear()} The Warpzone. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
