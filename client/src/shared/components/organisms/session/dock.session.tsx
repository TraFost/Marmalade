import { useState, useRef } from "react";
import {
	DotsThreeIcon,
	MicrophoneIcon,
	MicrophoneSlashIcon,
	KeyboardIcon,
	SquareIcon,
	ArrowUpIcon,
} from "@phosphor-icons/react";
import { cn } from "@/shared/lib/helper/classname";
import { useClickOutside } from "@/shared/hooks/use-click-outside.hook";

interface MenuDropdownProps {
	isTextMode: boolean;
	onToggleMode: VoidFunction;
}

interface ModeProps {
	menuRef: React.RefObject<HTMLDivElement | null>;
	showMenu: boolean;
	onMenuToggle: VoidFunction;
}

type SessionDockProps = {
	micMuted?: boolean;
	onMicMutedChange?: (muted: boolean) => void;
	onEndSession?: () => void;
	onSendText?: (text: string) => void;
	onUserTyping?: () => void;
};

export function SessionDock({
	micMuted,
	onMicMutedChange,
	onEndSession,
	onSendText,
	onUserTyping,
}: SessionDockProps) {
	const [isTextMode, setIsTextMode] = useState(false);
	const [showMenu, setShowMenu] = useState(false);

	const menuRef = useRef<HTMLDivElement>(null);

	const toggleMenu = () => {
		setShowMenu((prev) => !prev);
	};

	const toggleMode = () => {
		setIsTextMode((prev) => {
			const next = !prev;
			onMicMutedChange?.(next);
			return next;
		});
		setShowMenu(false);
	};

	useClickOutside(menuRef, () => setShowMenu(false));

	return (
		<div
			className={cn(
				"bg-white/5 backdrop-blur-md border border-white/10 px-6 py-4 rounded-full shadow-2xl",
				isTextMode ? "w-full max-w-2xl" : "w-auto"
			)}
		>
			{isTextMode ? (
				<TextMode
					menuRef={menuRef}
					onMenuToggle={toggleMenu}
					showMenu={showMenu}
					onEndSession={onEndSession}
					onSendText={onSendText}
					onUserTyping={onUserTyping}
				/>
			) : (
				<VoiceMode
					menuRef={menuRef}
					onMenuToggle={toggleMenu}
					showMenu={showMenu}
					micMuted={micMuted}
					onMicMutedChange={onMicMutedChange}
					onEndSession={onEndSession}
				/>
			)}

			{showMenu && (
				<MenuDropdown isTextMode={isTextMode} onToggleMode={toggleMode} />
			)}
		</div>
	);
}

function VoiceMode({
	menuRef,
	onMenuToggle,
	showMenu,
	micMuted,
	onMicMutedChange,
	onEndSession,
}: ModeProps & {
	micMuted?: boolean;
	onMicMutedChange?: (muted: boolean) => void;
	onEndSession?: () => void;
}) {
	const [localMuted, setLocalMuted] = useState(false);
	const isMuted = micMuted ?? localMuted;

	const toggleMuted = () => {
		const next = !isMuted;
		setLocalMuted(next);
		onMicMutedChange?.(next);
	};

	return (
		<section className="w-full flex items-center gap-8 animate-in slide-in-from-bottom-4 duration-300">
			<button
				onClick={toggleMuted}
				className={cn(
					"p-3 rounded-full transition-all active:scale-95",
					isMuted
						? "bg-red-500/10 text-red-400"
						: "hover:bg-white/10 text-slate-300"
				)}
			>
				{isMuted ? (
					<MicrophoneSlashIcon size={24} weight="fill" />
				) : (
					<MicrophoneIcon size={24} weight="fill" />
				)}
			</button>

			<button
				onClick={onEndSession}
				className="group relative px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 rounded-full transition-all active:scale-95 flex items-center gap-2"
			>
				<SquareIcon
					size={16}
					weight="fill"
					className="text-red-500 animate-pulse"
				/>
				<span className="text-sm font-medium text-red-400 group-hover:text-red-300">
					End Session
				</span>
			</button>

			<div className="relative" ref={menuRef}>
				<button
					onClick={onMenuToggle}
					className={cn(
						"p-3 rounded-full hover:bg-white/10 text-slate-300 transition-all active:scale-95",
						showMenu && "bg-white/10"
					)}
				>
					<DotsThreeIcon size={24} weight="bold" />
				</button>
			</div>
		</section>
	);
}

function TextMode({
	menuRef,
	onMenuToggle,
	showMenu,
	onEndSession,
	onSendText,
	onUserTyping,
}: ModeProps & {
	onEndSession?: () => void;
	onSendText?: (text: string) => void;
	onUserTyping?: () => void;
}) {
	const [inputText, setInputText] = useState("");

	const handleSend = () => {
		const trimmed = inputText.trim();
		if (!trimmed) return;
		onSendText?.(trimmed);
		setInputText("");
	};

	return (
		<div className="w-full flex items-end gap-3 animate-in slide-in-from-bottom-4 duration-300">
			<div className="flex-1 bg-white/5 backdrop-blur-md border border-teal-500/20 shadow-[0_0_15px_rgba(45,212,191,0.05)] rounded-4xl px-5 py-3 flex items-center gap-3">
				<KeyboardIcon size={24} className="text-teal-400 shrink-0" />
				<input
					type="text"
					value={inputText}
					onChange={(e) => {
						setInputText(e.target.value);
						onUserTyping?.();
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter") handleSend();
					}}
					placeholder="Type your thoughts..."
					className="bg-transparent border-none outline-none text-slate-200 text-sm w-full placeholder:text-slate-600 font-medium"
					autoFocus
				/>
				<button
					onClick={handleSend}
					disabled={!inputText.trim()}
					className="p-2 -mr-2 rounded-full bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:hover:bg-teal-500 text-slate-900 transition-colors"
				>
					<ArrowUpIcon size={20} weight="bold" />
				</button>
			</div>

			<div className="bg-white/5 backdrop-blur-md border border-white/10 p-2 rounded-full flex items-center gap-1 shrink-0">
				<button
					onClick={onEndSession}
					className="p-3 rounded-full hover:bg-red-500/20 text-red-400 transition-colors"
					title="End Session"
				>
					<SquareIcon size={20} weight="fill" />
				</button>

				<div className="relative" ref={menuRef}>
					<button
						onClick={onMenuToggle}
						className={cn(
							"p-3 rounded-full hover:bg-white/10 text-slate-300 transition-colors",
							showMenu && "bg-white/10"
						)}
					>
						<DotsThreeIcon size={24} weight="bold" />
					</button>
				</div>
			</div>
		</div>
	);
}

function MenuDropdown({ isTextMode, onToggleMode }: MenuDropdownProps) {
	return (
		<div className="absolute bottom-full right-0 mb-4 w-60 bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
			<button
				onClick={onToggleMode}
				className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-colors group"
			>
				{isTextMode ? (
					<MicrophoneIcon
						size={20}
						className="text-slate-400 group-hover:text-slate-200"
					/>
				) : (
					<KeyboardIcon
						size={20}
						className="text-slate-400 group-hover:text-slate-200"
					/>
				)}
				<div className="flex flex-col">
					<span className="text-sm font-medium text-slate-200">
						{isTextMode ? "Voice Mode" : "Text Input Mode"}
					</span>
					<span className="text-[10px] text-slate-500">
						{isTextMode
							? "Switch to voice interaction"
							: "Type instead of speaking"}
					</span>
				</div>
			</button>

			<div className="h-px bg-white/5 w-full" />
		</div>
	);
}
