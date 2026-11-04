import { LUGH_MARK_GROUP, LUGH_MARK_PATHS } from "@crm/ui/lib/lugh-mark";
import type * as React from "react";

const Logo = (props: React.SVGProps<SVGSVGElement>) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width={512}
		height={512}
		viewBox="0 0 64 64"
		fill="none"
		role="img"
		aria-label="Lugh"
		{...props}
	>
		<rect width="64" height="64" rx="15" fill="#faf9f7" />
		<g transform={LUGH_MARK_GROUP}>
			{LUGH_MARK_PATHS.map((path) => (
				<path
					key={path.name}
					transform={path.transform}
					fill={path.fill}
					d={path.d}
				/>
			))}
		</g>
	</svg>
);
export default Logo;
