import type { PropsWithChildren } from "react";
import { Footer } from "@/shared/components/molecules/footer";
import { Navbar } from "@/shared/components/molecules/navbar";
import { cn } from "@/shared/lib/helper/classname";

interface PublicLayoutProps extends PropsWithChildren {
	className?: string;
	contentClassName?: string;
}

export function PublicLayout({
	children,
	className,
	contentClassName,
}: PublicLayoutProps) {
	return (
		<div className={cn("size-full", className)}>
			<Navbar />
			<main className={cn("flex-1 pt-28", contentClassName)}>{children}</main>
			<Footer />
		</div>
	);
}
