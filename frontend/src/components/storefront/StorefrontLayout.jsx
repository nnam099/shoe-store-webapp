import { Outlet } from "react-router";

import { StorefrontFooter } from "./StorefrontFooter.jsx";
import { StorefrontHeader } from "./StorefrontHeader.jsx";

export function StorefrontLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <StorefrontHeader />
      <main className="min-h-[70vh]">
        <Outlet />
      </main>
      <StorefrontFooter />
    </div>
  );
}
