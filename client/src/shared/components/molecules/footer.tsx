import type { ReactNode } from "react";
import { Logo } from "@/shared/components/atoms/logo";
import { cn } from "@/shared/lib/helper/classname";

export interface FooterLink {
	href: string;
	label: string;
}

export interface FooterSocial {
	label: string;
	icon: ReactNode;
	href?: string;
}

interface FooterProps {
	className?: string;
}

const footerLinks: FooterLink[] = [
	{ href: "#", label: "About" },
	{ href: "#", label: "Privacy" },
	{ href: "#", label: "GitHub" },
	{ href: "#", label: "Contact" },
];

const socialIcons: FooterSocial[] = [
	{
		label: "twitter",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="h-4 w-4"
			>
				<path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
			</svg>
		),
	},
	{
		label: "github",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="h-4 w-4"
			>
				<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
				<path d="M9 18c-4.51 2-5-2-7-2" />
			</svg>
		),
	},
	{
		label: "linkedin",
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className="h-4 w-4"
			>
				<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
				<rect width="4" height="12" x="2" y="9" />
				<circle cx="4" cy="4" r="2" />
			</svg>
		),
	},
];

export function Footer({ className }: FooterProps) {
	return (
		<footer
			className={cn("border-t border-border/40 bg-card px-6 py-12", className)}
		>
			<div className="mx-auto flex max-w-6xl flex-col items-center gap-8 md:flex-row md:justify-between">
				<div className="flex items-center gap-3">
					<Logo className="h-5 text-foreground" uniColor />
					<span className="font-medium tracking-tight text-foreground">
						Marmalade
					</span>
				</div>
				<div className="flex gap-8 text-sm font-medium text-foreground/70">
					{footerLinks.map((link) => (
						<a
							key={link.label}
							href={link.href}
							className="transition-colors hover:text-primary"
						>
							{link.label}
						</a>
					))}
				</div>
			</div>
			<div className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-border/30 pt-8 text-center text-xs text-muted-foreground md:flex-row md:text-left">
				<div className="flex w-full justify-center gap-4 md:justify-end">
					{socialIcons.map((social) =>
						social.href ? (
							<a
								key={social.label}
								href={social.href}
								target="_blank"
								rel="noreferrer"
								aria-label={social.label}
								className="text-muted-foreground transition-colors hover:text-primary"
							>
								{social.icon}
							</a>
						) : (
							<button
								key={social.label}
								type="button"
								aria-label={social.label}
								className="text-muted-foreground transition-colors hover:text-primary"
							>
								{social.icon}
							</button>
						)
					)}
				</div>
			</div>
		</footer>
	);
}
