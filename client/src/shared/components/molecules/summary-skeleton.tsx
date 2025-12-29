import { Skeleton } from "@/shared/components/atoms/skeleton";

export function SummarySkeleton() {
	return (
		<div className="flex w-full max-w-3xl flex-col gap-6">
			<Skeleton className="h-24 w-full bg-gray-300" />
		</div>
	);
}
