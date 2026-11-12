import {
	Baby,
	Briefcase,
	Bus,
	Car,
	Circle,
	CircleQuestionMark,
	Coffee,
	CreditCard,
	Dumbbell,
	Film,
	Fuel,
	Gift,
	GraduationCap,
	HeartPulse,
	House,
	Landmark,
	type LucideIcon,
	Music,
	PawPrint,
	PiggyBank,
	Plane,
	Receipt,
	Repeat,
	Shield,
	Shirt,
	ShoppingBag,
	ShoppingCart,
	Smartphone,
	Utensils,
	Wallet,
	Wifi,
	Zap,
} from "lucide-react";
import { cn } from "@/lib/cn";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
	circle: Circle,
	"circle-question-mark": CircleQuestionMark,
	house: House,
	zap: Zap,
	shield: Shield,
	"credit-card": CreditCard,
	"shopping-cart": ShoppingCart,
	car: Car,
	bus: Bus,
	fuel: Fuel,
	plane: Plane,
	utensils: Utensils,
	coffee: Coffee,
	film: Film,
	music: Music,
	"shopping-bag": ShoppingBag,
	shirt: Shirt,
	"heart-pulse": HeartPulse,
	dumbbell: Dumbbell,
	repeat: Repeat,
	wifi: Wifi,
	smartphone: Smartphone,
	gift: Gift,
	"graduation-cap": GraduationCap,
	baby: Baby,
	"paw-print": PawPrint,
	"piggy-bank": PiggyBank,
	wallet: Wallet,
	landmark: Landmark,
	briefcase: Briefcase,
	receipt: Receipt,
};

export function CategoryIcon({
	icon,
	color,
	className,
}: {
	icon: string;
	color: string;
	className?: string;
}) {
	const Icon = CATEGORY_ICONS[icon] ?? Circle;
	return <Icon aria-hidden className={cn("size-4 shrink-0", className)} style={{ color }} />;
}
