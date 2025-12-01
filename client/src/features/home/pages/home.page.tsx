import { AboutSection } from "@/shared/components/organisms/home/about.home";
import { CallToActionSection } from "@/shared/components/organisms/home/cta.home";
import { FeatureSection } from "@/shared/components/organisms/home/features.home";
import { HeroSection } from "@/shared/components/organisms/home/hero.home";
import { HowItWorksSection } from "@/shared/components/organisms/home/how-it-works.home";
import { InspirationSection } from "@/shared/components/organisms/home/inspiration.home";
import { SupportSection } from "@/shared/components/organisms/home/support.home";

export function HomePage() {
	return (
		<div className="bg-background font-sans text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
			<HeroSection />
			<AboutSection />
			<FeatureSection />
			<HowItWorksSection />
			<InspirationSection />
			<SupportSection />
			<CallToActionSection />
		</div>
	);
}
