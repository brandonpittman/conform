import { useForm } from '@conform-to/react';
import { resolve, parse } from '@conform-to/zod';
import { useState } from 'react';
import { z } from 'zod';

const schema = z
	.object({
		email: z
			.string({ required_error: 'Email is required' })
			.email('Please enter a valid email'),
		password: z
			.string({ required_error: 'Password is required' })
			.min(10, 'The password should be at least 10 characters long'),
		'confirm-password': z.string({
			required_error: 'Confirm Password is required',
		}),
	})
	.refine((value) => value.password === value['confirm-password'], {
		message: 'The password does not match',
		path: ['confirm-password'],
	});

export default function SignupForm() {
	const formProps = useForm({
		validate: resolve(schema),
		onSubmit(event) {
			event.preventDefault();

			const formData = new FormData(event.currentTarget);
			const data = parse(formData, schema);

			console.log({ data });
		},
	});
	const [emailError, setEmailError] = useState('');
	const [passwordError, setPasswordError] = useState('');
	const [confirmPasswordError, setConfirmPasswordError] = useState('');

	return (
		<form {...formProps}>
			<label>
				<div>Email</div>
				<input
					type="email"
					name="email"
					onInvalid={(e) => {
						e.preventDefault();
						setEmailError(e.currentTarget.validationMessage);
					}}
				/>
				<div>{emailError}</div>
			</label>
			<label>
				<div>Password</div>
				<input
					type="password"
					name="password"
					onInvalid={(e) => {
						e.preventDefault();
						setPasswordError(e.currentTarget.validationMessage);
					}}
				/>
				<div>{passwordError}</div>
			</label>
			<label>
				<div>Confirm Password</div>
				<input
					type="password"
					name="confirm-password"
					onInvalid={(e) => {
						e.preventDefault();
						setConfirmPasswordError(e.currentTarget.validationMessage);
					}}
				/>
				<div>{confirmPasswordError}</div>
			</label>
			<div>
				<button type="submit">Login</button>
			</div>
		</form>
	);
}
