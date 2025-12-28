import { CaretLeftIcon } from "@phosphor-icons/react";

interface Props {
	onHandleBack: () => void;
}

export function BackButton({ onHandleBack }: Props) {
	return (
		<button
			type="button"
			onClick={onHandleBack}
			className="inline-flex items-center text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
		>
			<CaretLeftIcon size={16} weight="bold" className="mr-1" />
			Back
		</button>
	);
}
