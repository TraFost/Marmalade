import { WelcomePage } from "@/features/welcome/pages/welcome.page";
import { OnboardingPage } from "@/features/welcome/pages/onboarding.page";

import type { Page } from "./route";

export const PRIVATE_PAGES: Page[] = [
	{
		id: "welcome",
		label: "Welcome",
		path: "/welcome",
		element: <WelcomePage />,
	},
	{
		id: "onboarding",
		label: "Onboarding",
		path: "/welcome/onboarding",
		element: <OnboardingPage />,
	},
] as const;
