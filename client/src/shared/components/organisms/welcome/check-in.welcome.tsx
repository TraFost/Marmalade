import { DotLottieReact as DotLottiePlayer } from "@lottiefiles/dotlottie-react";
const intro2 = new URL(
	"../../../../assets/animations/lottie/intro-2.lottie",
	import.meta.url
).href;

export function CheckInIllustration() {
	return (
		<div className="relative mx-auto flex aspect-square w-full max-w-[400px] items-center justify-center top-24 right-5">
			<DotLottiePlayer
				src={intro2}
				autoplay
				loop
				style={{ width: "100%", height: "100%" }}
				aria-label="Check-in animation"
			/>
		</div>
	);
}
