"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Icon } from "@iconify/react";
import Profile from "./Profile";
import SidebarLayout from "../sidebar/Sidebar";
import FullLogo from "../shared/logo/FullLogo";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import Search from "./Search";
import JobNotifications from "./JobNotifications";

const Header = () => {
  const { theme, setTheme } = useTheme();
  const [isSticky, setIsSticky] = useState(false);
  const [mobileMenu, setMobileMenu] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const toggleMode = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  return (
    <>
      <header
        className={`sticky top-0 z-20 border-b border-border/70 backdrop-blur-xl transition-all ${
          isSticky ? "bg-background/95 shadow-sm" : "bg-background/80"
        }`}
      >
        <nav
          className={`mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8`}
        >
          {/* Mobile Toggle Icon */}
          <div
            onClick={() => {
              setIsOpen(true);
            }}
            className="relative flex size-9 cursor-pointer items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm transition hover:border-primary/30 hover:bg-accent hover:text-primary xl:hidden"
          >
            <Icon icon="tabler:menu-2" height={20} width={20} />
          </div>

          <div className="block xl:hidden">
            <FullLogo />
          </div>

          <div className="flex xl:hidden items-center">
            <div
              className="group relative flex size-9 cursor-pointer items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm transition hover:border-primary/30 hover:bg-accent hover:text-primary"
              onClick={toggleMode}
            >
              <span className="flex items-center justify-center">
                {theme === "light" ? (
                  <Icon icon="tabler:moon" width="20" className="text-foreground dark:text-muted-foreground group-hover:text-primary dark:group-hover:text-primary" />
                ) : (
                  <Icon
                    icon="solar:sun-bold-duotone"
                    width="20"
                    className="text-foreground dark:text-muted-foreground group-hover:text-primary dark:group-hover:text-primary"
                  />
                )}
              </span>
            </div>

            <JobNotifications />

            {/* Profile Dropdown */}
            <Profile />
          </div>

          <div className="hidden xl:flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              {/* Search Icon */}              
              <div className="relative">
                <Search />
              </div>
            </div>
            <div className="flex w-full justify-end items-end">
              <div className="flex gap-0 items-center ">
                {/* ✅ Dark/Light Toggle */}
                <button
                  aria-label="Toggle theme"
                  className="group relative flex size-9 cursor-pointer items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm transition hover:border-primary/30 hover:bg-accent hover:text-primary"
                  onClick={toggleMode}
                >
                  <span className="flex items-center justify-center">
                    {theme === "light" ? (
                      <Icon icon="tabler:moon" width="20" className="text-foreground dark:text-muted-foreground group-hover:text-primary dark:group-hover:text-primary" />
                    ) : (
                      <Icon
                        icon="solar:sun-bold-duotone"
                        width="20"
                        className="text-foreground dark:text-muted-foreground group-hover:text-primary dark:group-hover:text-primary"
                      />
                    )}
                  </span>
                </button>

                <JobNotifications />

                {/* Profile Dropdown */}
                <Profile />
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <VisuallyHidden>
            <SheetTitle>sidebar</SheetTitle>
          </VisuallyHidden>
          <SidebarLayout onClose={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
};

export default Header;
