import { Tabs } from "radix-ui";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { ForecastRowDrawer } from "@/components/drawers/forecast-row-drawer";
import { OneOffDrawer } from "@/components/drawers/one-off-drawer";
import { DebtView } from "@/components/forecast/debt-view";
import { MonthView } from "@/components/forecast/month-view";
import { YearView } from "@/components/forecast/year-view";
import { MonthNavigator } from "@/components/layout/month-navigator";
import { PageHeader } from "@/components/layout/page-header";
import { YearNavigator } from "@/components/layout/year-navigator";
import { useAddRowsFromCategories } from "@/hooks/use-forecast";
import { FORECAST_TABS, parseForecastTab, parseYear } from "@/lib/forecast";
import { parseMonth, shiftMonth } from "@/lib/month";
import type { ForecastRow, ForecastSection, OneOff } from "@/types";

/** A drawer is open on one section: an existing item, or null for a new one. */
type RowDrawer = { section: ForecastSection; row: ForecastRow | null } | null;
type OneOffDrawerState = { section: ForecastSection; oneOff: OneOff | null } | null;

export function ForecastPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const tab = parseForecastTab(searchParams.get("tab"));
	const year = parseYear(searchParams.get("year"));
	const month = parseMonth(searchParams.get("month"));
	const addFromCategories = useAddRowsFromCategories();
	const [rowDrawer, setRowDrawer] = useState<RowDrawer>(null);
	const [oneOffDrawer, setOneOffDrawer] = useState<OneOffDrawerState>(null);

	function patchParams(mutate: (next: URLSearchParams) => void) {
		setSearchParams((current) => {
			const next = new URLSearchParams(current);
			mutate(next);
			return next;
		});
	}

	function openMonthOf(date: string) {
		patchParams((next) => {
			next.set("tab", "month");
			next.set("month", date.slice(0, 7));
		});
	}

	async function onAddFromCategories() {
		try {
			const created = await addFromCategories.mutateAsync(year);
			if (created.length === 0) {
				toast.info("Every category is already on the plan");
				return;
			}
			toast.success(`Added ${created.length} item${created.length === 1 ? "" : "s"}`);
		} catch (_error) {
			toast.error("Could not add items from categories");
		}
	}

	return (
		<>
			<PageHeader title="Forecasting">
				{tab === "year" ? (
					<>
						<YearNavigator
							year={year}
							onShift={(delta) => patchParams((next) => next.set("year", String(year + delta)))}
						/>
						<button
							type="button"
							disabled={addFromCategories.isPending}
							onClick={() => void onAddFromCategories()}
							className="rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5 disabled:opacity-60"
						>
							Add from categories
						</button>
					</>
				) : tab === "month" ? (
					<MonthNavigator
						year={month.year}
						month={month.month}
						onShift={(delta) =>
							patchParams((next) => next.set("month", shiftMonth(month.year, month.month, delta)))
						}
					/>
				) : null}
			</PageHeader>

			<Tabs.Root
				value={tab}
				onValueChange={(next) =>
					patchParams((params) => {
						if (next === "year") params.delete("tab");
						else params.set("tab", next);
					})
				}
			>
				<Tabs.List
					aria-label="Forecast view"
					className="mb-4 inline-flex rounded-md border border-border p-0.5 text-sm"
				>
					{FORECAST_TABS.map((option) => (
						<Tabs.Trigger
							key={option.value}
							value={option.value}
							className="rounded px-3 py-1 transition-colors hover:bg-foreground/5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
						>
							{option.label}
						</Tabs.Trigger>
					))}
				</Tabs.List>
				<Tabs.Content value="year">
					<YearView
						year={year}
						onAddRow={(section) => setRowDrawer({ section, row: null })}
						onOpenRow={(section, row) => setRowDrawer({ section, row })}
						onAddOneOff={(section) => setOneOffDrawer({ section, oneOff: null })}
						onOpenOneOff={(section, oneOff) => setOneOffDrawer({ section, oneOff })}
						onSelectShortfall={openMonthOf}
						onOpenDebt={() => patchParams((next) => next.set("tab", "debt"))}
					/>
				</Tabs.Content>
				<Tabs.Content value="month">
					<MonthView year={month.year} month={month.month} />
				</Tabs.Content>
				<Tabs.Content value="debt">
					<DebtView />
				</Tabs.Content>
			</Tabs.Root>

			{rowDrawer ? (
				<ForecastRowDrawer
					key={rowDrawer.row?.id ?? `new-${rowDrawer.section.id}`}
					section={rowDrawer.section}
					row={rowDrawer.row}
					year={year}
					onClose={() => setRowDrawer(null)}
				/>
			) : null}
			{oneOffDrawer ? (
				<OneOffDrawer
					key={oneOffDrawer.oneOff?.id ?? `new-${oneOffDrawer.section.id}`}
					section={oneOffDrawer.section}
					oneOff={oneOffDrawer.oneOff}
					onClose={() => setOneOffDrawer(null)}
				/>
			) : null}
		</>
	);
}
