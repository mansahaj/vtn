import type { Metadata } from "next";
import "./globals.css";
import { GameProvider } from "@/lib/game-context";
import Sidebar from "@/components/layout/Sidebar";
import GameSelector from "@/components/layout/GameSelector";

export const metadata: Metadata = {
  title: "Game Day Revenue Risk Monitor",
  description: "Concessions demand forecasting and staff optimization dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <GameProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col">
              <GameSelector />
              <main className="flex-1 p-6">{children}</main>
            </div>
          </div>
        </GameProvider>
      </body>
    </html>
  );
}
