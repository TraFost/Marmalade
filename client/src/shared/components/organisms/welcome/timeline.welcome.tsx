import { DotLottieReact as DotLottiePlayer } from "@lottiefiles/dotlottie-react";
const intro3 = new URL(
	"../../../../assets/animations/lottie/intro-3.lottie",
	import.meta.url
).href;

export function TimelineIllustration() {
	return (
		<div className="relative mx-auto flex aspect-square w-full max-w-[280px] items-center justify-center top-20">
			<DotLottiePlayer
				src={intro3}
				autoplay
				loop
				style={{ width: "100%", height: "100%" }}
				aria-label="Timeline animation"
			/>
		</div>
	);
}
