import { useHotkeys, type Options } from "react-hotkeys-hook";

export function useHotkey(
	keyCombo: KeyboardEvent["key"] | KeyboardEvent["key"][],
	callback: (e: KeyboardEvent) => void,
	deps: Options = {}
) {
	useHotkeys(keyCombo, callback, {}, deps);
}
