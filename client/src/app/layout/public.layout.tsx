import { Outlet } from "react-router";

import { Footer } from "@/shared/components/molecules/footer";
import { Navbar } from "@/shared/components/molecules/navbar";

export function PublicLayout() {
	return (
		<>
			<Navbar />
			<Outlet />
			<Footer />
		</>
	);
}
