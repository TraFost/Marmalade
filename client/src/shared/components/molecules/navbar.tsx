import type { ReactNode } from "react";
import { Button } from "@/shared/components/atoms/button";
import { Logo } from "@/shared/components/atoms/logo";
import { cn } from "@/shared/lib/helper/classname";

export interface NavLink {
	href: string;
	label: string;
	icon?: ReactNode;
}

interface NavbarProps {
	className?: string;
}

const navLinks: NavLink[] = [
	{ href: "#how-it-works", label: "How it works" },
	{ href: "#features", label: "Features" },
	{ href: "#about", label: "Our Story" },
	{ href: "#story", label: "Inspiration" },
	{ href: "#support", label: "Support" },
];

export function Navbar({ className }: NavbarProps) {
	return (
		<nav
			className={cn(
				"fixed top-0 z-40 w-full px-6 py-4 transition-all duration-300 md:px-12",
				className
			)}
		>
			<div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-white/70 bg-card/80 px-6 py-3 shadow-sm shadow-primary/10 backdrop-blur-xl">
				<a
					href="#"
					className="flex items-center gap-3 text-lg font-medium tracking-tight"
				>
					<Logo className="h-5 text-foreground" />
					<span>Marmalade</span>
				</a>
				<div className="hidden items-center gap-8 text-sm font-medium text-foreground/70 md:flex">
					{navLinks.map((link) => (
						<a
							key={link.label}
							href={link.href}
							className="transition-colors hover:text-primary"
						>
							<span className="flex items-center gap-2">
								{link.icon}
								{link.label}
							</span>
						</a>
					))}
				</div>
				<div className="flex items-center gap-3">
					<Button
						variant="ghost"
						asChild
						className="hidden text-sm font-medium text-foreground hover:text-primary sm:inline-flex"
					>
						<a href="#cta">Get Started</a>
					</Button>
				</div>
			</div>
		</nav>
	);
}
