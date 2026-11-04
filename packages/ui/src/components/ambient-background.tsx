"use client";

import { cn } from "@crm/ui/lib/utils";
import { useEffect, useRef } from "react";

const WAVES = {
	lines: 26,
	band: { top: 0.22, bottom: 1.04 },
	amplitude: 34,
	frequency: 0.0021,
	speed: 0.00018,
	impulse: { wheel: 0.0016, scroll: 0.006, max: 2.6, decay: 0.94 },
	pointer: { radius: 220, lift: 46, ease: 0.08 },
	colorRefreshFrames: 45,
	lineWidth: 1,
} as const;

type Pointer = { x: number; y: number; strength: number; target: number };

function readWaveColor(element: HTMLElement): string {
	const value = getComputedStyle(element).getPropertyValue("--wave").trim();
	return value || "rgba(201, 193, 251, 0.11)";
}

function AmbientBackground({ className }: { className?: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const context = canvas.getContext("2d");
		if (!context) return;

		const reduceMotion = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		const pointer: Pointer = { x: -9999, y: -9999, strength: 0, target: 0 };
		const scrollPositions = new WeakMap<EventTarget, number>();
		let width = 0;
		let height = 0;
		let energy = 0;
		let phase = 0;
		let drift = 0;
		let frame = 0;
		let raf = 0;
		let color = readWaveColor(canvas);
		let last = performance.now();

		const resize = () => {
			const ratio = Math.min(window.devicePixelRatio || 1, 2);
			width = window.innerWidth;
			height = window.innerHeight;
			canvas.width = Math.round(width * ratio);
			canvas.height = Math.round(height * ratio);
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;
			context.setTransform(ratio, 0, 0, ratio, 0, 0);
		};

		const draw = () => {
			context.clearRect(0, 0, width, height);
			context.strokeStyle = color;
			context.lineWidth = WAVES.lineWidth;
			const top = height * WAVES.band.top;
			const span = height * (WAVES.band.bottom - WAVES.band.top);
			const amplitude = WAVES.amplitude * (1 + energy * 0.9);
			const step = Math.max(6, Math.round(width / 160));

			for (let line = 0; line < WAVES.lines; line++) {
				const t = line / (WAVES.lines - 1);
				const base = top + span * t + drift * (0.35 + t);
				const lineAmplitude = amplitude * (0.45 + t * 0.85);
				const offset = line * 0.38;
				context.globalAlpha = 0.35 + 0.65 * Math.sin(Math.PI * t);
				context.beginPath();
				for (let x = -step; x <= width + step; x += step) {
					const wave =
						Math.sin(x * WAVES.frequency + phase + offset) * lineAmplitude +
						Math.sin(x * WAVES.frequency * 0.47 - phase * 0.6 + offset * 1.7) *
							lineAmplitude *
							0.6;
					const dx = x - pointer.x;
					const dy = base + wave - pointer.y;
					const distance = Math.hypot(dx, dy);
					const bend =
						distance < WAVES.pointer.radius
							? (1 - distance / WAVES.pointer.radius) ** 2 *
								WAVES.pointer.lift *
								pointer.strength *
								Math.sign(dy || 1)
							: 0;
					const y = base + wave + bend;
					if (x === -step) context.moveTo(x, y);
					else context.lineTo(x, y);
				}
				context.stroke();
			}
			context.globalAlpha = 1;
		};

		const tick = (now: number) => {
			const elapsed = Math.min(now - last, 64);
			last = now;
			energy *= WAVES.impulse.decay;
			drift *= 0.92;
			pointer.strength += (pointer.target - pointer.strength) * WAVES.pointer.ease;
			phase += elapsed * WAVES.speed * (1 + energy * 6);
			frame++;
			if (frame % WAVES.colorRefreshFrames === 0) color = readWaveColor(canvas);
			draw();
			raf = requestAnimationFrame(tick);
		};

		const kick = (amount: number) => {
			energy = Math.min(WAVES.impulse.max, energy + Math.abs(amount));
		};

		const onWheel = (event: WheelEvent) => {
			kick(event.deltaY * WAVES.impulse.wheel);
			drift = Math.max(-60, Math.min(60, drift - event.deltaY * 0.05));
		};

		const onScroll = (event: Event) => {
			const target = event.target;
			if (!target) return;
			const element =
				target instanceof Document ? target.scrollingElement : target;
			if (!(element instanceof HTMLElement)) return;
			const previous = scrollPositions.get(element) ?? element.scrollTop;
			const delta = element.scrollTop - previous;
			scrollPositions.set(element, element.scrollTop);
			if (delta !== 0) kick(delta * WAVES.impulse.scroll * 0.1);
		};

		const onPointerMove = (event: PointerEvent) => {
			pointer.x = event.clientX;
			pointer.y = event.clientY;
			pointer.target = 1;
		};

		const onPointerLeave = () => {
			pointer.target = 0;
		};

		const onVisibility = () => {
			cancelAnimationFrame(raf);
			if (!document.hidden && !reduceMotion) {
				last = performance.now();
				raf = requestAnimationFrame(tick);
			}
		};

		resize();
		draw();
		window.addEventListener("resize", resize);

		if (!reduceMotion) {
			window.addEventListener("wheel", onWheel, { passive: true });
			document.addEventListener("scroll", onScroll, {
				passive: true,
				capture: true,
			});
			window.addEventListener("pointermove", onPointerMove, { passive: true });
			document.documentElement.addEventListener("pointerleave", onPointerLeave);
			document.addEventListener("visibilitychange", onVisibility);
			raf = requestAnimationFrame(tick);
		}

		const observer = new MutationObserver(() => {
			color = readWaveColor(canvas);
			if (reduceMotion) draw();
		});
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});

		return () => {
			cancelAnimationFrame(raf);
			observer.disconnect();
			window.removeEventListener("resize", resize);
			window.removeEventListener("wheel", onWheel);
			document.removeEventListener("scroll", onScroll, { capture: true });
			window.removeEventListener("pointermove", onPointerMove);
			document.documentElement.removeEventListener(
				"pointerleave",
				onPointerLeave,
			);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	}, []);

	return (
		<div
			aria-hidden="true"
			data-slot="ambient-background"
			className={cn(
				"pointer-events-none fixed inset-0 -z-10 overflow-hidden",
				className,
			)}
		>
			<div className="ambient-glow absolute inset-0" />
			<canvas ref={canvasRef} className="absolute inset-0" />
		</div>
	);
}

export { AmbientBackground };
