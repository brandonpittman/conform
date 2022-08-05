import { useForm, parse } from '@conform-to/react';
import { useState } from 'react';

export default function PaymentForm() {
	const formProps = useForm({
		onSubmit(event) {
			event.preventDefault();

			const formData = new FormData(event.currentTarget);
			const submission = parse(formData);

			console.log(submission);
		},
	});
	const [accountError, setAccountError] = useState('');
	const [valueError, setValueError] = useState('');
	const [currencyError, setCurrenyError] = useState('');
	const [referenceError, setReferenceError] = useState('');

	return (
		<form {...formProps}>
			<label>
				<div>Account Number</div>
				<input
					type="text"
					name="account"
					required
					onInvalid={(e) => {
						e.preventDefault();
						setAccountError(e.currentTarget.validationMessage);
					}}
				/>
				<div>{accountError}</div>
			</label>
			<label>
				<div>Amount</div>
				<input
					type="number"
					name="amount.value"
					onInvalid={(e) => {
						e.preventDefault();
						setValueError(e.currentTarget.validationMessage);
					}}
					required
					min={10}
					step={0.1}
				/>
				<div>{valueError}</div>
			</label>
			<label>
				<div>Currency</div>
				<select
					name="amount.currency"
					onInvalid={(e) => {
						e.preventDefault();
						setCurrenyError(e.currentTarget.validationMessage);
					}}
					required
				>
					<option value="">Please select</option>
					<option value="USD">USD</option>
					<option value="EUR">EUR</option>
					<option value="HKD">HKD</option>
				</select>
				<div>{currencyError}</div>
			</label>
			<label>
				<div>Reference</div>
				<textarea
					name="reference"
					minLength={5}
					onInvalid={(e) => {
						e.preventDefault();
						setReferenceError(e.currentTarget.validationMessage);
					}}
				/>
				<div>{referenceError}</div>
			</label>
			<div>
				<button type="submit">Transfer</button>
			</div>
		</form>
	);
}
