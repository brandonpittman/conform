import { useForm, parse, useFieldset } from '@conform-to/react';

interface Payment {
	account: string;
	amount: {
		currency: string;
		value: number;
	};
	reference?: string;
}

export default function PaymentForm() {
	const form = useForm({
		onSubmit(event) {
			event.preventDefault();

			const formData = new FormData(event.currentTarget);
			const submission = parse(formData);

			console.log(submission);
		},
	});
	const { account, amount, reference } = useFieldset<Payment>(form.ref);
	const { currency, value } = useFieldset(form.ref, amount);

	return (
		<form {...form}>
			<label>
				<div>Account Number</div>
				<input type="text" name={account.name} required />
				<div>{account.error}</div>
			</label>
			<label>
				<div>Amount</div>
				<input type="number" name={value.name} required min={10} step={0.1} />
				<div>{value.error}</div>
			</label>
			<label>
				<div>Currency</div>
				<select name={currency.name} required>
					<option value="">Please select</option>
					<option value="USD">USD</option>
					<option value="EUR">EUR</option>
					<option value="HKD">HKD</option>
				</select>
				<div>{currency.error}</div>
			</label>
			<label>
				<div>Reference</div>
				<textarea name={reference.name} minLength={5} />
				<div>{reference.error}</div>
			</label>
			<div>
				<button type="submit">Transfer</button>
			</div>
		</form>
	);
}
