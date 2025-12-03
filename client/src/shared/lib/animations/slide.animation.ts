export const slideVariants = {
	enter: (dir: number) => ({
		x: dir > 0 ? 100 : -100,
		opacity: 0,
	}),
	center: {
		x: 0,
		opacity: 1,
	},
	exit: (dir: number) => ({
		x: dir > 0 ? -100 : 100,
		opacity: 0,
	}),
};
