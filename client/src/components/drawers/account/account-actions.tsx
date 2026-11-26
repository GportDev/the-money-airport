import { reconnectItem } from "@/api/plaid";
import { ConnectPlaidButton } from "@/components/accounts/connect-plaid-button";
import { Button } from "@/components/ui/button";
import type { BankAccount } from "@/types";

export type AccountActionHandlers = {
	onDelete?: () => void;
	onDisconnect?: () => void;
	onReconnected?: () => void;
};

type Props = AccountActionHandlers & { account: BankAccount };

/** Delete (manual), Disconnect (Plaid), and the Reconnect paths for a broken Plaid Item. */
export function AccountActions({ account, onDelete, onDisconnect, onReconnected }: Props) {
	const itemId = account.plaidItemId;
	return (
		<div className="flex flex-wrap gap-2 px-4">
			{account.source === "manual" && onDelete ? (
				<Button variant="danger-outline" size="sm" type="button" onClick={onDelete}>
					Delete
				</Button>
			) : null}
			{account.source === "plaid" && onDisconnect ? (
				<Button variant="danger-outline" size="sm" type="button" onClick={onDisconnect}>
					Disconnect
				</Button>
			) : null}
			{itemId && account.plaidItemStatus === "disconnected" && onReconnected ? (
				<Button
					variant="outline"
					size="sm"
					type="button"
					onClick={() => void reconnectItem(itemId).then(onReconnected)}
				>
					Reconnect
				</Button>
			) : null}
			{itemId && account.errorCode === "ITEM_LOGIN_REQUIRED" ? (
				<ConnectPlaidButton
					itemId={itemId}
					label="Reconnect with Plaid"
					onDone={() => onReconnected?.()}
				/>
			) : null}
		</div>
	);
}
