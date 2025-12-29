import { DotLottieReact as DotLottiePlayer } from "@lottiefiles/dotlottie-react";
const intro1 = new URL(
	"../../../../assets/animations/lottie/intro-1.lottie",
	import.meta.url
).href;

export function MeetMarmaladeIllustration() {
	return (
		<div className="relative mx-auto aspect-square w-full max-w-[350px] top-5">
			<DotLottiePlayer
				src={intro1}
				autoplay
				loop
				style={{ width: "100%", height: "100%" }}
				aria-label="Meet Marmalade animation"
			/>
		</div>
	);
}
