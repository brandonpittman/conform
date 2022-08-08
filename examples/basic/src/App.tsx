import { useForm, useFieldset } from '@conform-to/react';

export default function LoginForm() {
	const form = useForm({
		initialReport: 'onBlur',
		onSubmit: (event) => {
			event.preventDefault();

			const formData = new FormData(event.currentTarget);
			const data = Object.fromEntries(formData);

			console.log(data);
		},
	});
	const { email, password } = useFieldset(form.ref);

	return (
		<form {...form}>
			<label>
				<div>Email</div>
				<input type="email" name="email" required />
				<div>{email.error}</div>
			</label>
			<label>
				<div>Password</div>
				<input type="password" name="password" required />
				<div>{password.error}</div>
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