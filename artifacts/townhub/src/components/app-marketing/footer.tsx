import { Link } from "wouter";
import { appMarketingConfig } from "@/lib/app-marketing-config";
import { TownhubLogoMark } from "@/components/app-marketing/townhub-logo-mark";

export function AppMarketingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-8 max-w-[1280px]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <a
              href="#top"
              className="mb-6 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-fit inline-flex"
            >
              <TownhubLogoMark sizePx={32} wordmarkClassName="text-xl" />
            </a>
            <p className="text-[17px] text-gray-500 max-w-sm mb-6 font-sans">
              Local information. Local businesses. One community. Everything happening in your town,
              all in one place.
            </p>
          </div>

          <div>
            <h2 className="font-semibold text-primary mb-4 text-[17px] font-sans">Product</h2>
            <ul className="space-y-3">
              <li>
                <a
                  href="#features"
                  className="text-gray-500 hover:text-primary transition-colors text-[17px] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Features
                </a>
              </li>
              <li>
                <a
                  href="#businesses"
                  className="text-gray-500 hover:text-primary transition-colors text-[17px] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  For Businesses
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  className="text-gray-500 hover:text-primary transition-colors text-[17px] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  About Us
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-primary mb-4 text-[17px] font-sans">Support</h2>
            <ul className="space-y-3">
              <li>
                <a
                  href={`mailto:${appMarketingConfig.supportEmail}`}
                  className="text-gray-500 hover:text-primary transition-colors text-[17px] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Contact
                </a>
              </li>
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-gray-500 hover:text-primary transition-colors text-[17px] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-of-service"
                  className="text-gray-500 hover:text-primary transition-colors text-[17px] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/business-seller-agreement"
                  className="text-gray-500 hover:text-primary transition-colors text-[17px] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Business Seller Agreement
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-400">&copy; {currentYear} TownHub. All rights reserved.</p>
          <p className="text-sm text-gray-400">
            Launching first in {appMarketingConfig.launchCommunity}
          </p>
        </div>
      </div>
    </footer>
  );
}
