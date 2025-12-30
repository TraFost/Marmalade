import type { ReactNode } from "react";
import {
	LinkedinLogoIcon,
	GithubLogoIcon,
} from "@phosphor-icons/react/dist/ssr";

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
	{ href: "#how-it-works", label: "How it works" },
	{ href: "#features", label: "Features" },
	{ href: "#about", label: "Our Story" },
	{ href: "#story", label: "Inspiration" },
	{ href: "#support", label: "Support" },
];

const socialIcons: FooterSocial[] = [
	{
		label: "github",
		icon: <GithubLogoIcon className="h-4 w-4" />,
		href: "https://github.com/TraFost/Marmalade",
	},
	{
		label: "linkedin",
		icon: <LinkedinLogoIcon className="h-4 w-4" />,
		href: "https://www.linkedin.com/in/rahmannrdn",
	},
];

export function Footer({ className }: FooterProps) {
	return (
		<footer
			className={cn("border-t border-border/40 bg-card px-6 py-12", className)}
		>
			<div className="mx-auto flex max-w-6xl flex-col items-center gap-8 md:flex-row md:justify-between">
				<div className="flex flex-col items-start gap-3">
					<div className="flex items-center gap-3">
						<Logo className="h-5 text-foreground" uniColor />
						<span className="font-medium tracking-tight text-foreground">
							Marmalade
						</span>
					</div>
					<p className="mt-1 text-xs text-foreground/70">
						Real-time voice companion, private and reliable.
					</p>
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
