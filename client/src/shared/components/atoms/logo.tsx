import { cn } from "@/shared/lib/helper/classname";

export const Logo = ({
	className,
	uniColor: _uniColor,
}: {
	className?: string;
	uniColor?: boolean;
}) => {
	return (
		<img
			src="/assets/icons/marmalade-app-icon.webp"
			alt="Marmalade logo"
			className={cn("h-5 w-auto", className)}
			loading="lazy"
			decoding="async"
		/>
	);
};

export const LogoIcon = ({
	className,
	uniColor: _uniColor,
}: {
	className?: string;
	uniColor?: boolean;
}) => {
	return (
		<img
			src="/assets/icons/marmalade-app-icon.webp"
			alt="Marmalade icon"
			className={cn("size-5", className)}
			loading="lazy"
			decoding="async"
		/>
	);
};
