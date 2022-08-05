import { useForm } from '@conform-to/react';
import { useState } from 'react';

export default function LoginForm() {
	const formProps = useForm({
		initialReport: 'onBlur',
		onSubmit: (event) => {
			event.preventDefault();

			const formData = new FormData(event.currentTarget);
			const data = Object.fromEntries(formData);

			console.log({ data });
		},
	});
	const [emailError, setEmailError] = useState('');
	const [passwordError, setPasswordError] = useState('');

	return (
		<form {...formProps}>
			<label>
				<div>Email</div>
				<input
					type="email"
					name="email"
					required
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
					required
					onInvalid={(e) => {
						e.preventDefault();
						setPasswordError(e.currentTarget.validationMessage);
					}}
				/>
				<div>{passwordError}</div>
			</label>
			<div>
				<label>
					<span>Remember me</span>
					<input type="checkbox" name="remember-me" value="yes" />
				</label>
			</div>
			<div>
				<button type="submit">Login</button>
			</div>
		</form>
	);
}
