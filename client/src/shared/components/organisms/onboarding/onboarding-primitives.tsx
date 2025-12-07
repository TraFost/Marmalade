import type { ReactNode } from "react";

import { Button } from "@/shared/components/atoms/button";
import { cn } from "@/shared/lib/helper/classname";

export type OnboardingSectionProps = {
	title: string;
	description?: string;
	children: ReactNode;
};

export function OnboardingSection({
	title,
	description,
	children,
}: OnboardingSectionProps) {
	return (
		<section className="space-y-4">
			<div>
				<h2 className="text-xl font-semibold tracking-tight text-foreground">
					{title}
				</h2>
				{description ? (
					<p className="mt-1 text-sm text-muted-foreground">{description}</p>
				) : null}
			</div>
			{children}
		</section>
	);
}

export type OnboardingTileProps = {
	selected?: boolean;
	onClick?: () => void;
	children: ReactNode;
	className?: string;
	ariaLabel?: string;
};

export function OnboardingTile({
	selected,
	onClick,
	children,
	className,
	ariaLabel,
}: OnboardingTileProps) {
	return (
		<Button
			type="button"
			variant="ghost"
			onClick={onClick}
			aria-pressed={selected}
			aria-label={ariaLabel}
			className={cn(
				"flex w-full items-center justify-center rounded-xl border px-4 py-3 text-center text-sm font-medium transition-all duration-200",
				selected
					? "border-primary bg-primary/5 text-foreground shadow-sm"
					: "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
				className
			)}
		>
			{children}
		</Button>
	);
}

export type OnboardingScaleButtonProps = {
	value: number;
	isActive: boolean;
	onSelect: (value: number) => void;
};

export function OnboardingScaleButton({
	value,
	isActive,
	onSelect,
}: OnboardingScaleButtonProps) {
	return (
		<Button
			type="button"
			variant="ghost"
			onClick={() => onSelect(value)}
			className={cn(
				"flex h-12 w-12 items-center justify-center rounded-xl text-sm font-semibold transition-colors px-0",
				isActive
					? "bg-primary text-primary-foreground shadow-sm"
					: "bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-foreground"
			)}
		>
			{value}
		</Button>
	);
}
