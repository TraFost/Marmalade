import { DotLottieReact as DotLottiePlayer } from "@lottiefiles/dotlottie-react";
const intro4 = new URL(
	"../../../../assets/animations/lottie/intro-4.lottie",
	import.meta.url
).href;

export function VoiceIllustration() {
	return (
		<div className="relative mx-auto flex aspect-square w-full max-w-[320px] items-center justify-center top-20">
			<DotLottiePlayer
				src={intro4}
				autoplay
				loop
				style={{ width: "100%", height: "100%" }}
				aria-label="Voice animation"
			/>
		</div>
	);
}
