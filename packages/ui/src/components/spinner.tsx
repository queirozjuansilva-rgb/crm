import { LUGH_MARK_GROUP, LUGH_MARK_PATHS } from "@crm/ui/lib/lugh-mark";
import { cn } from "@crm/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const MARK_FILL = {
	wing: "currentColor",
	tail: "var(--ring)",
	body: "var(--primary)",
} as const;

const spinnerVariants = cva("shrink-0", {
	variants: {
		size: {
			default: "size-4",
			lg: "size-12",
		},
	},
	defaultVariants: {
		size: "default",
	},
});

function Spinner({
	className,
	size,
	...props
}: React.ComponentProps<"svg"> & VariantProps<typeof spinnerVariants>) {
	return (
		<svg
			data-slot="spinner"
			role="status"
			aria-label="Carregando"
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 64 64"
			fill="none"
			className={cn(spinnerVariants({ size }), className)}
			{...props}
		>
			<circle
				cx="32"
				cy="32"
				r="29"
				stroke="currentColor"
				strokeOpacity={0.12}
				strokeWidth={3}
			/>
			<circle
				cx="32"
				cy="32"
				r="29"
				stroke="var(--ring)"
				strokeWidth={3}
				strokeLinecap="round"
				pathLength={100}
				strokeDasharray="26 74"
				className="animate-spinner-trace"
			/>
			<g className="origin-center animate-spinner-glide">
				<g transform={LUGH_MARK_GROUP}>
					{LUGH_MARK_PATHS.map((path) => (
						<path
							key={path.name}
							transform={path.transform}
							fill={MARK_FILL[path.name]}
							d={path.d}
						/>
					))}
				</g>
			</g>
		</svg>
	);
}

export { Spinner };
