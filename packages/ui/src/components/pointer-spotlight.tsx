"use client";

import { useEffect } from "react";

const SURFACE_SELECTOR = ".glass-surface, .spotlight";

function PointerSpotlight() {
	useEffect(() => {
		if (!window.matchMedia("(hover: hover)").matches) return;

		let raf = 0;
		let pending: PointerEvent | null = null;

		const apply = () => {
			raf = 0;
			const event = pending;
			pending = null;
			if (!event || !(event.target instanceof Element)) return;
			const surface = event.target.closest<HTMLElement>(SURFACE_SELECTOR);
			if (!surface) return;
			const rect = surface.getBoundingClientRect();
			surface.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
			surface.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
		};

		const onPointerMove = (event: PointerEvent) => {
			pending = event;
			if (!raf) raf = requestAnimationFrame(apply);
		};

		document.addEventListener("pointermove", onPointerMove, { passive: true });

		return () => {
			cancelAnimationFrame(raf);
			document.removeEventListener("pointermove", onPointerMove);
		};
	}, []);

	return null;
}

export { PointerSpotlight };
