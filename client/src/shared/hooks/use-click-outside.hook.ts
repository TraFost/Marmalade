import { useEffect } from "react";

export function useClickOutside<T extends HTMLElement = HTMLElement>(
	ref: React.RefObject<T | null> | null,
	handler: (event: MouseEvent | TouchEvent) => void
) {
	useEffect(() => {
		function handleClickOutside(event: MouseEvent | TouchEvent) {
			if (ref && ref.current && !ref.current.contains(event.target as Node)) {
				handler(event);
			}
		}

		document.addEventListener("click", handleClickOutside);
		document.addEventListener("touchend", handleClickOutside);

		return () => {
			document.removeEventListener("click", handleClickOutside);
			document.removeEventListener("touchend", handleClickOutside);
		};
	}, [ref, handler]);
}
