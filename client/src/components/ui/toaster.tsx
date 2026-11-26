import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
	return <Sonner theme="light" position="top-right" className="font-sans" {...props} />;
}
