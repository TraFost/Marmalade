import type { PropsWithChildren } from "react";
import { Outlet } from "react-router";

import { Footer } from "@/shared/components/molecules/footer";
import { Navbar } from "@/shared/components/molecules/navbar";
import { cn } from "@/shared/lib/helper/classname";

interface PublicLayoutProps extends PropsWithChildren {
	className?: string;
	contentClassName?: string;
}

export function PublicLayout({}: PublicLayoutProps) {
	return (
		<div className={cn("size-full")}>
			<Navbar />
			<main className={cn("flex-1 pt-28")}>
				<Outlet />
			</main>
			<Footer />
		</div>
	);
}
