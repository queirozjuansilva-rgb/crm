"use client";

import { cn } from "@crm/ui/lib/utils";
import { useEffect, useRef } from "react";

const WAVES = {
	lines: 26,
	band: { top: 0.22, bottom: 1.04 },
	amplitude: 30,
	frequency: 0.0021,
	speed: 0.00011,
	breath: { speed: 0.00009, depth: 0.28 },
	sway: { speed: 0.00005, depth: 14 },
	colorRefreshFrames: 45,
	lineWidth: 1,
} as const;

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
		let width = 0;
		let height = 0;
		let time = 0;
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
			draw();
		};

		const draw = () => {
			context.clearRect(0, 0, width, height);
			context.strokeStyle = color;
			context.lineWidth = WAVES.lineWidth;
			const top = height * WAVES.band.top;
			const span = height * (WAVES.band.bottom - WAVES.band.top);
			const phase = time * WAVES.speed;
			const breath =
				1 + Math.sin(time * WAVES.breath.speed) * WAVES.breath.depth;
			const sway = Math.sin(time * WAVES.sway.speed) * WAVES.sway.depth;
			const step = Math.max(6, Math.round(width / 160));

			for (let line = 0; line < WAVES.lines; line++) {
				const t = line / (WAVES.lines - 1);
				const base = top + span * t + sway * (0.4 + t);
				const lineAmplitude = WAVES.amplitude * breath * (0.45 + t * 0.85);
				const offset = line * 0.38;
				context.globalAlpha = 0.35 + 0.65 * Math.sin(Math.PI * t);
				context.beginPath();
				for (let x = -step; x <= width + step; x += step) {
					const y =
						base +
						Math.sin(x * WAVES.frequency + phase + offset) * lineAmplitude +
						Math.sin(x * WAVES.frequency * 0.47 - phase * 0.6 + offset * 1.7) *
							lineAmplitude *
							0.6;
					if (x === -step) context.moveTo(x, y);
					else context.lineTo(x, y);
				}
				context.stroke();
			}
			context.globalAlpha = 1;
		};

		const tick = (now: number) => {
			time += Math.min(now - last, 64);
			last = now;
			frame++;
			if (frame % WAVES.colorRefreshFrames === 0) color = readWaveColor(canvas);
			draw();
			raf = requestAnimationFrame(tick);
		};

		const onVisibility = () => {
			cancelAnimationFrame(raf);
			if (!document.hidden && !reduceMotion) {
				last = performance.now();
				raf = requestAnimationFrame(tick);
			}
		};

		resize();
		window.addEventListener("resize", resize);

		if (!reduceMotion) {
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
