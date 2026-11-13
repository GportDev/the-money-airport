import { Tabs } from "radix-ui";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { EditAccountsDrawer } from "@/components/drawers/edit-accounts-drawer";
import { FundDrawer } from "@/components/drawers/fund-drawer";
import { GoalDrawer } from "@/components/drawers/goal-drawer";
import { GoalList } from "@/components/goals/goal-list";
import { PageHeader } from "@/components/layout/page-header";
import { useGoals } from "@/hooks/use-goals";
import {
	GOAL_EDIT_ACCOUNTS_PARAM,
	GOAL_EDIT_ACCOUNTS_VALUE,
	GOAL_TABS,
	parseGoalTab,
} from "@/lib/goals";
import type { Goal } from "@/types";

/** "new" opens the create drawer; a Goal opens its edit drawer. */
type GoalDrawerState = "new" | Goal | null;

export function GoalsPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const tab = parseGoalTab(searchParams.get("tab"));
	const isEditAccountsOpen =
		searchParams.get(GOAL_EDIT_ACCOUNTS_PARAM) === GOAL_EDIT_ACCOUNTS_VALUE;
	const goals = useGoals(tab);
	const [goalDrawer, setGoalDrawer] = useState<GoalDrawerState>(null);
	const [fundId, setFundId] = useState<string | null>(null);
	const data = goals.data;
	const currency = data?.baseCurrency ?? "USD";
	const openFund = data?.goals.find((goal) => goal.id === fundId);

	function patchParams(mutate: (next: URLSearchParams) => void) {
		setSearchParams((current) => {
			const next = new URLSearchParams(current);
			mutate(next);
			return next;
		});
	}

	function onOpen(goal: Goal) {
		if (goal.funding === "fund") setFundId(goal.id);
		else setGoalDrawer(goal);
	}

	return (
		<>
			<PageHeader title="Goals">
				<button
					type="button"
					onClick={() =>
						patchParams((next) => next.set(GOAL_EDIT_ACCOUNTS_PARAM, GOAL_EDIT_ACCOUNTS_VALUE))
					}
					className="rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-foreground/5"
				>
					Edit accounts
				</button>
				<button
					type="button"
					onClick={() => setGoalDrawer("new")}
					className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85"
				>
					Add goal
				</button>
			</PageHeader>

			<Tabs.Root
				value={tab}
				onValueChange={(next) =>
					patchParams((params) => {
						if (next === "pay_down") params.set("tab", next);
						else params.delete("tab");
					})
				}
			>
				<Tabs.List
					aria-label="Goal type"
					className="mb-4 inline-flex rounded-md border border-border p-0.5 text-sm"
				>
					{GOAL_TABS.map((option) => (
						<Tabs.Trigger
							key={option.value}
							value={option.value}
							className="rounded px-3 py-1 transition-colors hover:bg-foreground/5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
						>
							{option.label}
						</Tabs.Trigger>
					))}
				</Tabs.List>
				<Tabs.Content value={tab}>
					{goals.isError ? (
						<p role="alert" className="text-sm text-negative">
							Could not load goals.
						</p>
					) : data ? (
						<GoalList
							type={tab}
							goals={data.goals}
							total={data.totalCurrent}
							currency={currency}
							onOpen={onOpen}
							onAdd={() => setGoalDrawer("new")}
						/>
					) : (
						<p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
					)}
				</Tabs.Content>
			</Tabs.Root>

			{goalDrawer ? (
				<GoalDrawer
					key={goalDrawer === "new" ? "new" : goalDrawer.id}
					goal={goalDrawer === "new" ? null : goalDrawer}
					defaultType={tab}
					onClose={() => setGoalDrawer(null)}
				/>
			) : null}
			{openFund ? (
				<FundDrawer
					key={openFund.id}
					goal={openFund}
					currency={currency}
					onEdit={() => setGoalDrawer(openFund)}
					onClose={() => setFundId(null)}
				/>
			) : null}
			{isEditAccountsOpen ? (
				<EditAccountsDrawer
					key={tab}
					type={tab}
					onClose={() => patchParams((next) => next.delete(GOAL_EDIT_ACCOUNTS_PARAM))}
				/>
			) : null}
		</>
	);
}
